document.addEventListener('DOMContentLoaded', function() {
    const fbVolumeSlider = document.getElementById('fbVolumeSlider');
    const fbVolumeValue = document.getElementById('fbVolumeValue');
    const igVolumeSlider = document.getElementById('igVolumeSlider');
    const igVolumeValue = document.getElementById('igVolumeValue');
    const positionOptions = document.querySelectorAll('.position-option');

    // 創建防抖函數
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // 防抖化的儲存函數
    const saveVolumeDebounced = debounce((key, value) => {
        chrome.storage.sync.set({ [key]: value }, function() {
            console.log(`${key} saved: ${value}%`);
        });
    }, 500);

    // 從存儲中讀取位置設定和音量值
    chrome.storage.sync.get(['savedFbVolume', 'savedIgVolume', 'sliderPosition'], function(result) {
        let savedFbVolume = result.savedFbVolume !== undefined ? result.savedFbVolume : 20;
        let savedIgVolume = result.savedIgVolume !== undefined ? result.savedIgVolume : 20;
        let savedPosition = result.sliderPosition || 'top-right';

        // 設置音量值
        fbVolumeSlider.value = savedFbVolume;
        fbVolumeValue.textContent = savedFbVolume;
        igVolumeSlider.value = savedIgVolume;
        igVolumeValue.textContent = savedIgVolume;

        // 設置位置選項的選中狀態
        positionOptions.forEach(option => {
            if (option.dataset.position === savedPosition) {
                option.classList.add('selected');
            }
        });
    });

    // 處理位置選項的點擊事件
    positionOptions.forEach(option => {
        option.addEventListener('click', function() {
            // 移除所有選項的選中狀態
            positionOptions.forEach(opt => opt.classList.remove('selected'));
            // 添加當前選項的選中狀態
            this.classList.add('selected');
            
            // 保存位置設定
            const newPosition = this.dataset.position;
            chrome.storage.sync.set({ sliderPosition: newPosition }, function() {
                console.log('Slider position saved: ' + newPosition);
                
                // 通知 content script 更新滑桿位置
                chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                    if (tabs[0].url.includes('facebook.com') || tabs[0].url.includes('instagram.com')) {
                        try {
                            chrome.tabs.sendMessage(tabs[0].id, {
                                action: 'updatePosition',
                                position: newPosition
                            }, response => {
                                if (chrome.runtime.lastError) {
                                    console.log('需要重新載入頁面以套用新設定');
                                    // 重新載入頁面以重新注入 content script
                                    chrome.tabs.reload(tabs[0].id);
                                }
                            });
                        } catch (e) {
                            console.log('Connection error, reloading page...');
                            chrome.tabs.reload(tabs[0].id);
                        }
                    }
                });
            });
        });
    });

    // 當 Facebook 滑桿變化時，僅影響 Facebook Reel 的音量
    fbVolumeSlider.addEventListener('input', function() {
        let newFbVolume = fbVolumeSlider.value;
        fbVolumeValue.textContent = newFbVolume;

        saveVolumeDebounced('savedFbVolume', newFbVolume);

        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            // 檢查是否是 Facebook 網站
            if (tabs[0].url.includes('facebook.com')) {
                try {
                    chrome.scripting.executeScript({
                        target: {tabId: tabs[0].id},
                        function: setFacebookVolume,
                        args: [newFbVolume / 100]
                    });
                } catch (e) {
                    console.log('Script execution error, reloading page...');
                    chrome.tabs.reload(tabs[0].id);
                }
            }
        });
    });

    // 當 Instagram 滑桿變化時，僅影響 Instagram 的音量
    igVolumeSlider.addEventListener('input', function() {
        let newIgVolume = igVolumeSlider.value;
        igVolumeValue.textContent = newIgVolume;

        saveVolumeDebounced('savedIgVolume', newIgVolume);

        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            // 檢查是否是 Instagram 網站
            if (tabs[0].url.includes('instagram.com')) {
                try {
                    chrome.scripting.executeScript({
                        target: {tabId: tabs[0].id},
                        function: setInstagramVolume,
                        args: [newIgVolume / 100]
                    });
                } catch (e) {
                    console.log('Script execution error, reloading page...');
                    chrome.tabs.reload(tabs[0].id);
                }
            }
        });
    });
});

// 設置 Facebook Reel 的音量
function setFacebookVolume(volume) {
    let videos = document.querySelectorAll('video');
    videos.forEach(video => {
        video.volume = volume;
    });
}

// 設置 Instagram 影片的音量
function setInstagramVolume(volume) {
    let videos = document.querySelectorAll('video');
    videos.forEach(video => {
        video.volume = volume;
    });
}
