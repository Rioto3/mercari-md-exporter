// popup.js - ポップアップウィンドウの制御

document.addEventListener('DOMContentLoaded', async () => {
    const statusElement = document.getElementById('status');
    const statusText = document.getElementById('status-text');
    const exportButton = document.getElementById('export-button');
    const exportJsonButton = document.getElementById('export-json-button');

    // 現在のタブを取得
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];

    const isItemPage = currentTab.url &&
        currentTab.url.match(/^https:\/\/jp\.mercari\.com\/item\/[^\/]+$/);
    const isSearchPage = currentTab.url &&
        currentTab.url.match(/^https:\/\/jp\.mercari\.com\/search/);

    if (!isItemPage && !isSearchPage) {
        updateStatus('error', '❌ メルカリの対応ページではありません');
        return;
    }

    // content script の疎通確認
    try {
        await browser.tabs.sendMessage(currentTab.id, { action: 'ping' });
    } catch (error) {
        updateStatus('error', '❌ ページの読み込みに失敗しました');
        console.error('Content script connection failed:', error);
        return;
    }

    if (isItemPage) {
        updateStatus('ready', '✅ MDエクスポート可能です');
        exportButton.disabled = false;
    } else if (isSearchPage) {
        updateStatus('ready', '✅ JSONエクスポート可能です');
        exportButton.style.display = 'none';
        exportJsonButton.style.display = 'block';
        exportJsonButton.disabled = false;
    }

    // ---- MD エクスポート ----
    exportButton.addEventListener('click', async () => {
        try {
            updateStatus('processing', '⏳ エクスポート中...');
            exportButton.disabled = true;

            const response = await browser.tabs.sendMessage(currentTab.id, {
                action: 'extractItemData'
            });

            if (response.success) {
                const downloadResponse = await browser.runtime.sendMessage({
                    action: 'downloadMarkdown',
                    data: response.data,
                    filename: generateMdFilename(response.data.title)
                });

                if (downloadResponse.success) {
                    updateStatus('ready', '✅ ファイルダウンロード完了！');
                    setTimeout(() => window.close(), 3000);
                } else {
                    throw new Error(downloadResponse.error || 'ダウンロードに失敗しました');
                }
            } else {
                throw new Error(response.error || '商品データの抽出に失敗しました');
            }
        } catch (error) {
            console.error('Export failed:', error);
            updateStatus('error', `❌ エラー: ${error.message}`);
        } finally {
            exportButton.disabled = false;
        }
    });

    // ---- JSON エクスポート ----
    exportJsonButton.addEventListener('click', async () => {
        try {
            updateStatus('processing', '⏳ JSONエクスポート中...');
            exportJsonButton.disabled = true;

            const response = await browser.tabs.sendMessage(currentTab.id, {
                action: 'extractSearchResults'
            });

            if (response.success) {
                const filename = generateJsonFilename();
                const downloadResponse = await browser.runtime.sendMessage({
                    action: 'downloadJson',
                    data: response.data,
                    filename
                });

                if (downloadResponse.success) {
                    updateStatus('ready', '✅ JSONダウンロード完了！');
                    setTimeout(() => window.close(), 2000);
                } else {
                    throw new Error(downloadResponse.error || 'JSONダウンロード失敗');
                }
            } else {
                throw new Error(response.error || '検索結果の抽出に失敗しました');
            }
        } catch (error) {
            console.error('JSON export failed:', error);
            updateStatus('error', `❌ エラー: ${error.message}`);
        } finally {
            exportJsonButton.disabled = false;
        }
    });

    // ---- ユーティリティ ----

    function updateStatus(type, message) {
        statusElement.className = `status ${type}`;
        statusText.textContent = message;
    }

    function generateMdFilename(title) {
        const safeTitle = title
            .replace(/[<>:"\/\\|?*]/g, '_')
            .replace(/\s+/g, '_')
            .substring(0, 50);
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
        return `mercari_${safeTitle}_${timestamp}.md`;
    }

    function generateJsonFilename() {
        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
                   `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
        return `mlist-${ts}.json`;
    }
});
