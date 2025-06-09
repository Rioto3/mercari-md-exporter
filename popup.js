// popup.js - ポップアップウィンドウの制御

document.addEventListener('DOMContentLoaded', async () => {
    const statusElement = document.getElementById('status');
    const statusText = document.getElementById('status-text');
    const exportButton = document.getElementById('export-button');
    
    // 現在のタブを取得
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];
    
    // メルカリ商品ページかどうかチェック
    if (!currentTab.url || !currentTab.url.match(/^https:\/\/jp\.mercari\.com\/item\/[^\/]+$/)) {
        updateStatus('error', '❌ メルカリ商品詳細ページではありません');
        return;
    }
    
    // ページが正常に読み込まれているかチェック
    try {
        await browser.tabs.sendMessage(currentTab.id, { action: 'ping' });
        updateStatus('ready', '✅ エクスポート可能です');
        exportButton.disabled = false;
    } catch (error) {
        updateStatus('error', '❌ ページの読み込みに失敗しました');
        console.error('Content script connection failed:', error);
    }
    
    // エクスポートボタンのクリックイベント
    exportButton.addEventListener('click', async () => {
        try {
            updateStatus('processing', '⏳ エクスポート中...');
            exportButton.disabled = true;
            
            // Content scriptに商品データの抽出を依頼
            const response = await browser.tabs.sendMessage(currentTab.id, {
                action: 'extractItemData'
            });
            
            if (response.success) {
                // Background scriptにダウンロード処理を依頼
                const downloadResponse = await browser.runtime.sendMessage({
                    action: 'downloadMarkdown',
                    data: response.data,
                    filename: generateFilename(response.data.title)
                });
                
                if (downloadResponse.success) {
                    updateStatus('ready', '✅ ファイルダウンロード完了！');
                    
                    // 3秒後にポップアップを閉じる
                    setTimeout(() => {
                        window.close();
                    }, 3000);
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
    
    /**
     * ステータス表示を更新
     * @param {string} type - ready, error, processing
     * @param {string} message - 表示メッセージ
     */
    function updateStatus(type, message) {
        statusElement.className = `status ${type}`;
        statusText.textContent = message;
    }
    
    /**
     * ファイル名を生成
     * @param {string} title - 商品タイトル
     * @returns {string} ファイル名
     */
    function generateFilename(title) {
        // タイトルを安全なファイル名に変換
        const safeTitle = title
            .replace(/[<>:"/\\|?*]/g, '_') // 禁止文字を置換
            .replace(/\s+/g, '_') // 空白をアンダースコアに
            .substring(0, 50); // 長さ制限
        
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
        return `mercari_${safeTitle}_${timestamp}.md`;
    }
});
