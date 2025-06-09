// content.js - メルカリページからの情報抽出とデバッグ

// Background scriptとのメッセージ通信リスナー
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'ping') {
        sendResponse({ status: 'ok' });
        return true;
    }
    
    if (message.action === 'extractItemData') {
        try {
            const itemData = extractItemData();
            sendResponse({ success: true, data: itemData });
        } catch (error) {
            console.error('Data extraction failed:', error);
            sendResponse({ success: false, error: error.message });
        }
        return true;
    }
    
    if (message.action === 'copyToClipboard') {
        try {
            // デバッグ用：まずテキストをコンソールに出力
            console.log('Attempting to copy to clipboard:', message.text.substring(0, 200) + '...');
            
            // 複数の方法を試す
            copyToClipboardMultipleWays(message.text)
                .then(() => {
                    console.log('Successfully copied to clipboard');
                    sendResponse({ success: true });
                })
                .catch(error => {
                    console.error('All clipboard methods failed:', error);
                    // フォールバック：テキストエリアを作成して手動選択
                    showTextForManualCopy(message.text);
                    sendResponse({ success: false, error: error.message });
                });
        } catch (error) {
            console.error('Clipboard operation failed:', error);
            sendResponse({ success: false, error: 'Clipboard operation failed' });
        }
        return true;
    }
});

/**
 * 複数の方法でクリップボードにコピーを試行
 */
async function copyToClipboardMultipleWays(text) {
    // 方法1: 最新のClipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            console.log('Method 1 (navigator.clipboard) succeeded');
            return;
        } catch (error) {
            console.warn('Method 1 failed:', error);
        }
    }
    
    // 方法2: 旧式のexecCommand API
    try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-999999px';
        textarea.style.top = '-999999px';
        document.body.appendChild(textarea);
        textarea.select();
        const result = document.execCommand('copy');
        document.body.removeChild(textarea);
        
        if (result) {
            console.log('Method 2 (execCommand) succeeded');
            return;
        } else {
            throw new Error('execCommand returned false');
        }
    } catch (error) {
        console.warn('Method 2 failed:', error);
    }
    
    throw new Error('All clipboard methods failed');
}

/**
 * フォールバック：手動コピー用のモーダルを表示
 */
function showTextForManualCopy(text) {
    // モーダル背景
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    // コンテンツ
    const content = document.createElement('div');
    content.style.cssText = `
        background: white;
        padding: 20px;
        border-radius: 8px;
        max-width: 80%;
        max-height: 80%;
        overflow: auto;
    `;
    
    const title = document.createElement('h3');
    title.textContent = 'Markdownをコピーしてください';
    title.style.marginTop = '0';
    
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.cssText = `
        width: 100%;
        height: 300px;
        font-family: monospace;
        font-size: 12px;
    `;
    textarea.readOnly = true;
    
    const closeButton = document.createElement('button');
    closeButton.textContent = '閉じる';
    closeButton.style.cssText = `
        margin-top: 10px;
        padding: 8px 16px;
        background: #ff4500;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    `;
    
    closeButton.onclick = () => {
        document.body.removeChild(modal);
    };
    
    // 自動選択
    textarea.onclick = () => {
        textarea.select();
    };
    
    content.appendChild(title);
    content.appendChild(textarea);
    content.appendChild(closeButton);
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // 自動選択
    setTimeout(() => {
        textarea.select();
    }, 100);
}

/**
 * メルカリ商品ページから情報を抽出
 * @returns {Object} 抽出された商品データ
 */
function extractItemData() {
    const data = {
        title: '',
        price: '',
        basicInfo: {},
        category: '',
        description: '',
        seller: {},
        comments: [],
        url: window.location.href,
        exportedAt: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })
    };
    
    // 商品タイトル
    const titleElement = document.querySelector('h1[data-testid="name"]') || 
                        document.querySelector('h1.heading__a7d91561');
    data.title = titleElement ? titleElement.textContent.trim() : '商品名不明';
    
    // 価格情報
    const priceElement = document.querySelector('[data-testid="price"]');
    if (priceElement) {
        const currencyEl = priceElement.querySelector('.currency');
        const numberEl = priceElement.querySelector('.number__6b270ca7') || 
                        priceElement.querySelector('span:last-child');
        const currency = currencyEl ? currencyEl.textContent : '¥';
        const number = numberEl ? numberEl.textContent : '';
        data.price = `${currency}${number}`;
        
        // 税込・送料情報
        const priceNote = document.querySelector('.iAMJxr') || 
                         document.querySelector('p.merText.caption__5616e150');
        if (priceNote) {
            data.price += ` ${priceNote.textContent.trim()}`;
        }
    }
    
    // 基本情報（商品の状態、配送情報等）
    const infoRows = document.querySelectorAll('.merDisplayRow');
    infoRows.forEach(row => {
        const titleEl = row.querySelector('.title__32cba457');
        const bodyEl = row.querySelector('.body__32cba457');
        
        if (titleEl && bodyEl) {
            const key = titleEl.textContent.trim();
            let value = bodyEl.textContent.trim();
            
            // 複数行の値を適切に処理
            const lines = value.split('\n').filter(line => line.trim());
            if (lines.length > 1) {
                value = lines.join(' ');
            }
            
            data.basicInfo[key] = value;
        }
    });
    
    // カテゴリー（パンくずリスト）
    const breadcrumbs = document.querySelectorAll('.merBreadcrumbItem a');
    const categoryParts = Array.from(breadcrumbs)
        .map(link => link.textContent.trim())
        .filter(text => text && text !== 'ホーム');
    data.category = categoryParts.join(' > ');
    
    // 商品説明
    const descElement = document.querySelector('[data-testid="description"]');
    data.description = descElement ? descElement.textContent.trim() : '';
    
    // 出品者情報
    const sellerLink = document.querySelector('a[href*="/user/profile/"]');
    if (sellerLink) {
        const sellerName = sellerLink.querySelector('.merText.body__5616e150.primary__5616e150.bold__5616e150') ||
                          sellerLink.querySelector('.userName__449ec81a');
        data.seller.name = sellerName ? sellerName.textContent.trim() : '';
        
        // 評価情報
        const ratingEl = sellerLink.querySelector('.merRating');
        if (ratingEl) {
            const ratingText = ratingEl.getAttribute('aria-label') || '';
            const countEl = ratingEl.querySelector('.count__60fe6cce');
            const count = countEl ? countEl.textContent.trim() : '';
            data.seller.rating = ratingText;
            data.seller.reviewCount = count;
        }
        
        // 本人確認バッジ
        const verifiedEl = sellerLink.querySelector('.merVerificationBadge');
        data.seller.verified = !!verifiedEl;
        
        // 出品者バッジ
        const badges = document.querySelectorAll('[data-testid="seller-badge"]');
        data.seller.badges = Array.from(badges).map(badge => {
            const text = badge.querySelector('.merText');
            return text ? text.textContent.trim() : '';
        }).filter(text => text);
    }
    
    // コメント
    const commentElements = document.querySelectorAll('.comment__449ec81a');
    commentElements.forEach(commentEl => {
        const nameEl = commentEl.querySelector('.userName__449ec81a');
        const contentEl = commentEl.querySelector('.merText.body__5616e150.inherit__5616e150');
        const timeEl = commentEl.querySelector('.time__449ec81a');
        
        if (nameEl && contentEl && timeEl) {
            const name = nameEl.textContent.trim();
            const content = contentEl.textContent.trim();
            const timeText = timeEl.textContent.trim();
            const parsedTime = parseRelativeTime(timeText);
            
            data.comments.push({
                name,
                content,
                time: parsedTime
            });
        }
    });
    
    return data;
}

/**
 * 相対時間を具体的な日時に変換
 * @param {string} relativeTime - "23時間前"、"19分前"等の相対時間
 * @returns {string} YYYY/MM/DD HH:MM 形式の日時
 */
function parseRelativeTime(relativeTime) {
    const now = new Date();
    
    // 分前の処理
    const minuteMatch = relativeTime.match(/(\d+)分前/);
    if (minuteMatch) {
        const minutes = parseInt(minuteMatch[1]);
        const targetTime = new Date(now.getTime() - minutes * 60 * 1000);
        return formatDateTime(targetTime);
    }
    
    // 時間前の処理
    const hourMatch = relativeTime.match(/(\d+)時間前/);
    if (hourMatch) {
        const hours = parseInt(hourMatch[1]);
        const targetTime = new Date(now.getTime() - hours * 60 * 60 * 1000);
        return formatDateTime(targetTime);
    }
    
    // 日前の処理
    const dayMatch = relativeTime.match(/(\d+)日前/);
    if (dayMatch) {
        const days = parseInt(dayMatch[1]);
        const targetTime = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        return formatDateTime(targetTime);
    }
    
    // 週前の処理
    const weekMatch = relativeTime.match(/(\d+)週間前/);
    if (weekMatch) {
        const weeks = parseInt(weekMatch[1]);
        const targetTime = new Date(now.getTime() - weeks * 7 * 24 * 60 * 60 * 1000);
        return formatDateTime(targetTime);
    }
    
    // 月前の処理
    const monthMatch = relativeTime.match(/(\d+)ヶ?月前/);
    if (monthMatch) {
        const months = parseInt(monthMatch[1]);
        const targetTime = new Date(now.getFullYear(), now.getMonth() - months, now.getDate(), now.getHours(), now.getMinutes());
        return formatDateTime(targetTime);
    }
    
    // パースできない場合は現在時刻を返す
    return formatDateTime(now);
}

/**
 * 日時をYYYY/MM/DD HH:MM形式にフォーマット
 * @param {Date} date - 日時オブジェクト
 * @returns {string} フォーマットされた日時文字列
 */
function formatDateTime(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}/${month}/${day} ${hours}:${minutes}`;
}
