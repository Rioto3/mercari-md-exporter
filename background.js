// background.js - Markdown生成とファイルダウンロード

// メッセージリスナー
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'downloadMarkdown') {
        try {
            console.log('Starting markdown download process');
            const markdown = generateMarkdown(message.data);
            console.log('Generated markdown length:', markdown.length);
            
            downloadMarkdownFile(markdown, message.filename)
                .then(() => {
                    console.log('Download completed successfully');
                    sendResponse({ success: true });
                })
                .catch(error => {
                    console.error('Download failed:', error);
                    sendResponse({ success: false, error: error.message });
                });
        } catch (error) {
            console.error('Markdown generation failed:', error);
            sendResponse({ success: false, error: error.message });
        }
        return true; // 非同期レスポンスを示す
    }
});

/**
 * 商品データからMarkdownを生成
 * @param {Object} data - 商品データ
 * @returns {string} Markdown形式の文字列
 */
function generateMarkdown(data) {
    let markdown = '';
    
    // タイトル
    markdown += `# ${data.title}\n\n`;
    
    // 基本情報
    markdown += '## 基本情報\n\n';
    if (data.price) {
        markdown += `- **価格**: ${data.price}\n`;
    }
    
    // 商品詳細情報を追加
    Object.entries(data.basicInfo).forEach(([key, value]) => {
        markdown += `- **${key}**: ${value}\n`;
    });
    markdown += '\n';
    
    // カテゴリー
    if (data.category) {
        markdown += '## カテゴリー\n\n';
        markdown += `${data.category}\n\n`;
    }
    
    // 商品説明
    if (data.description) {
        markdown += '## 商品の説明\n\n';
        markdown += `${data.description}\n\n`;
    }
    
    // 出品者情報
    if (data.seller && data.seller.name) {
        markdown += '## 出品者情報\n\n';
        markdown += `- **出品者**: ${data.seller.name}\n`;
        
        if (data.seller.rating && data.seller.reviewCount) {
            markdown += `- **評価**: ${data.seller.rating} (${data.seller.reviewCount}件のレビュー)\n`;
        }
        
        if (data.seller.verified) {
            markdown += '- **本人確認**: 済み\n';
        }
        
        if (data.seller.badges && data.seller.badges.length > 0) {
            markdown += `- **バッジ**: ${data.seller.badges.join('、')}\n`;
        }
        
        markdown += '\n';
    }
    
    // コメント
    if (data.comments && data.comments.length > 0) {
        markdown += '## コメント\n\n';
        data.comments.forEach(comment => {
            markdown += `### ${comment.name} (${comment.time})\n`;
            markdown += `${comment.content}\n\n`;
        });
    }
    
    // メタ情報
    markdown += '---\n\n';
    markdown += `*エクスポート日時: ${data.exportedAt}*  \n`;
    markdown += `*商品URL: ${data.url}*\n`;
    
    return markdown;
}

/**
 * Markdownファイルをダウンロード
 * @param {string} markdown - Markdownテキスト
 * @param {string} filename - ファイル名
 */
async function downloadMarkdownFile(markdown, filename) {
    try {
        // Data URLを作成
        const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        console.log('Created blob URL:', url);
        console.log('Filename:', filename);
        
        // browser.downloads.downloadを使用
        const downloadId = await browser.downloads.download({
            url: url,
            filename: filename,
            saveAs: false // 直接ダウンロードフォルダに保存
        });
        
        console.log('Download started with ID:', downloadId);
        
        // ダウンロード完了を待つ
        return new Promise((resolve, reject) => {
            const listener = (delta) => {
                if (delta.id === downloadId && delta.state) {
                    if (delta.state.current === 'complete') {
                        browser.downloads.onChanged.removeListener(listener);
                        URL.revokeObjectURL(url); // メモリを解放
                        resolve();
                    } else if (delta.state.current === 'interrupted') {
                        browser.downloads.onChanged.removeListener(listener);
                        URL.revokeObjectURL(url);
                        reject(new Error('Download was interrupted'));
                    }
                }
            };
            
            browser.downloads.onChanged.addListener(listener);
            
            // タイムアウト（30秒）
            setTimeout(() => {
                browser.downloads.onChanged.removeListener(listener);
                URL.revokeObjectURL(url);
                reject(new Error('Download timeout'));
            }, 30000);
        });
        
    } catch (error) {
        console.error('Download error:', error);
        throw error;
    }
}
