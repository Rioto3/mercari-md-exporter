// background.js - Markdown生成とファイルダウンロード

// メッセージリスナー
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'downloadMarkdown') {
        try {
            const markdown = generateMarkdown(message.data);
            downloadFile(markdown, message.filename);
            sendResponse({ success: true });
        } catch (error) {
            console.error('Download failed:', error);
            sendResponse({ success: false, error: error.message });
        }
        return true;
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
 * ファイルをダウンロード
 * @param {string} content - ファイル内容
 * @param {string} filename - ファイル名
 */
async function downloadFile(content, filename) {
    // Blobを作成
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    
    // Data URLを作成
    const reader = new FileReader();
    reader.onload = function() {
        // Downloads APIを使用してファイルをダウンロード
        browser.downloads.download({
            url: reader.result,
            filename: filename,
            saveAs: false // 自動的にダウンロードフォルダに保存
        }).catch(error => {
            console.error('Download failed:', error);
        });
    };
    reader.readAsDataURL(blob);
}
