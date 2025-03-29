(function() {
    'use strict';

    let sliderPosition = 'bottom-left'; // 預設位置

    // 創建音量控制滑桿
    function createVolumeSlider(video) {
        const container = document.createElement('div');
        const slider = document.createElement('input');
        
        // 創建音量值顯示元素
        const volumeValue = document.createElement('div');
        volumeValue.style.cssText = `
            color: white;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            font-size: 13px;
            font-weight: 500;
            text-align: center;
            user-select: none;
            min-width: 36px;
            opacity: 0.9;
            margin: 0;
            padding: 0;
            line-height: 28px;
        `;
        
        // 設置滑桿容器樣式
        container.style.cssText = `
            position: absolute;
            z-index: 5;
            width: auto;
            height: 36px;
            display: flex;
            flex-direction: row;
            align-items: center;
            gap: 8px;
            background: rgba(0, 0, 0, 0.6);
            border-radius: 18px;
            padding: 6px 10px;
            backdrop-filter: blur(4px);
            transition: opacity 0.3s;
        `;

        slider.type = 'range';
        slider.min = '0';
        slider.max = '100';
        slider.style.cssText = `
            -webkit-appearance: none;
            width: 90px;
            height: 4px;
            background: rgba(255, 255, 255, 0.3);
            outline: none;
            border-radius: 2px;
            cursor: pointer;
            margin: 0 4px;
            padding: 0;
        `;

        // 添加滑桿樣式
        const sliderStyles = document.createElement('style');
        sliderStyles.textContent = `
            input[type=range]::-webkit-slider-runnable-track {
                width: 100%;
                height: 4px;
                background: rgba(255, 255, 255, 0.3);
                border-radius: 2px;
                border: none;
            }
            input[type=range]::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: white;
                cursor: pointer;
                transition: transform 0.2s ease;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
                margin-top: -6px;
            }
            input[type=range]::-webkit-slider-thumb:hover {
                transform: scale(1.1);
            }
        `;
        document.head.appendChild(sliderStyles);

        container.appendChild(slider);
        container.appendChild(volumeValue);
        
        // 根據位置設置容器位置
        updateSliderPosition(container, sliderPosition);
        
        // 設置初始音量
        function initializeVolume() {
            return new Promise((resolve) => {
                try {
                    const key = window.location.hostname.includes('facebook.com') 
                        ? 'savedFbVolume' 
                        : 'savedIgVolume';
                    
                    chrome.storage.sync.get([key], function(result) {
                        if (chrome.runtime.lastError) {
                            console.log('Storage error, using default volume');
                            slider.value = 20;
                            video.volume = 0.2;
                            volumeValue.textContent = '20%';
                            resolve();
                            return;
                        }
                        const volume = result[key] !== undefined ? result[key] : 20;
                        slider.value = volume;
                        video.volume = volume / 100;
                        volumeValue.textContent = volume + '%';
                        resolve();
                    });
                } catch (e) {
                    console.log('Storage access error, using default volume');
                    slider.value = 20;
                    video.volume = 0.2;
                    volumeValue.textContent = '20%';
                    resolve();
                }
            });
        }
        
        // 等待音量初始化完成後再顯示滑桿
        initializeVolume().then(() => {
            // 延遲一點顯示，確保音量已經設置好
            setTimeout(() => {
                container.style.display = 'flex';
            }, 100);
        });

        // 初始隱藏容器
        container.style.display = 'none';

        // 創建防抖函數
        let saveTimeout;
        const saveVolumeWithDebounce = (value, platform) => {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                try {
                    const data = platform === 'fb' 
                        ? { savedFbVolume: value }
                        : { savedIgVolume: value };
                    
                    chrome.storage.sync.set(data, () => {
                        if (chrome.runtime.lastError) {
                            console.log('Volume save failed, will retry on next change');
                        }
                    });
                } catch (e) {
                    console.log('Storage save error, will retry on next change');
                }
            }, 500); // 500ms 延遲
        };

        // 監聽滑桿變化
        slider.addEventListener('input', function() {
            const newVolume = slider.value / 100;
            video.volume = newVolume;
            volumeValue.textContent = slider.value + '%';
            
            // 使用防抖保存音量設定
            if (window.location.hostname.includes('facebook.com')) {
                saveVolumeWithDebounce(slider.value, 'fb');
            } else if (window.location.hostname.includes('instagram.com')) {
                saveVolumeWithDebounce(slider.value, 'ig');
            }
        });

        // 設置初始音量顯示
        volumeValue.textContent = slider.value + '%';

        // 滑鼠懸停顯示/隱藏效果
        container.style.opacity = '0';
        video.parentElement.addEventListener('mouseenter', () => container.style.opacity = '1');
        video.parentElement.addEventListener('mouseleave', () => container.style.opacity = '0');

        return container;
    }

    // 更新滑桿位置
    function updateSliderPosition(container, position) {
        switch (position) {
            case 'top-left':
                container.style.top = '10px';
                container.style.left = '10px';
                break;
            case 'top-right':
                container.style.top = '10px';
                container.style.right = '10px';
                break;
            case 'bottom-left':
                container.style.bottom = '10px';
                container.style.left = '10px';
                break;
            case 'bottom-right':
                container.style.bottom = '10px';
                container.style.right = '10px';
                break;
        }
    }

    // 添加滑桿到影片
    function addSliderToVideo(video) {
        if (!video.parentElement.querySelector('input[type="range"]')) {
            const slider = createVolumeSlider(video);
            video.parentElement.style.position = 'relative';
            video.parentElement.appendChild(slider);
        }
    }

    // 從storage讀取position設定
    try {
        chrome.storage.sync.get(['sliderPosition'], function(result) {
            if (chrome.runtime.lastError) {
                console.log('Position setting read failed, using default');
                return;
            }
            if (result.sliderPosition) {
                sliderPosition = result.sliderPosition;
            }
        });
    } catch (e) {
        console.log('Storage access error, using default position');
    }

    // 獲取所有影片元素，包括動態中的 Reels
    function findAllVideos() {
        const videos = [];
        
        // 一般影片
        document.querySelectorAll('video').forEach(video => {
            videos.push(video);
        });

        // 動態中的 Reels（使用更多選擇器）
        const reelsSelectors = [
            // Facebook Reels 選擇器
            '[role="main"] [data-visualcompletion="ignore-dynamic"] video',
            '[role="main"] [data-pagelet="FeedUnit"] video',
            '[role="main"] [data-pagelet="Stories"] video',
            '[role="complementary"] video',
            // 新增 Reels 特定選擇器
            'div[style*="aspect-ratio: 9/16"] video',
            'div[data-video-id] video',
            'div[aria-label*="Reels"] video',
            'div[role="presentation"] video',
            // 留言區影片選擇器
            'div[role="article"] video'
        ];

        reelsSelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(video => {
                if (!videos.includes(video)) {
                    videos.push(video);
                }
            });
        });

        return videos;
    }

    // Function to apply saved volume to videos
    function setSavedVolume(platform) {
        try {
            const key = platform === 'fb' ? 'savedFbVolume' : 'savedIgVolume';
            chrome.storage.sync.get([key], function(result) {
                if (chrome.runtime.lastError) {
                    console.log('Volume read failed, using default');
                    const defaultVolume = 0.2;
                    const videos = findAllVideos();
                    videos.forEach(video => {
                        video.volume = defaultVolume;
                        addSliderToVideo(video);
                    });
                    return;
                }

                const savedVolume = result[key] !== undefined ? result[key] / 100 : 0.2;
                const videos = findAllVideos();
                videos.forEach(video => {
                    video.volume = savedVolume;
                    addSliderToVideo(video);
                });
            });
        } catch (e) {
            console.log('Storage access error, using default volume');
            const defaultVolume = 0.2;
            let videos = document.querySelectorAll('video');
            videos.forEach(video => {
                video.volume = defaultVolume;
                addSliderToVideo(video);
            });
        }
    }

    // 應用到特定平台
    function setSavedFbVolume() {
        setSavedVolume('fb');
    }

    function setSavedIgVolume() {
        setSavedVolume('ig');
    }

    // 處理新的位置設定
    function handlePositionUpdate(newPosition) {
        sliderPosition = newPosition;
        document.querySelectorAll('input[type="range"]').forEach(slider => {
            updateSliderPosition(slider.parentElement, newPosition);
        });
    }

    // 判斷當前是 Facebook 還是 Instagram，並應用相應的音量
    if (window.location.hostname.includes('facebook.com')) {
        setSavedFbVolume();
    } else if (window.location.hostname.includes('instagram.com')) {
        setSavedIgVolume();
    }

    // 監聽來自 popup 的位置更新訊息
    try {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'updatePosition') {
                handlePositionUpdate(request.position);
            }
            // 回傳 true 表示會非同步回應
            return true;
        });
    } catch (e) {
        console.log('Extension context invalidated, reloading page...');
        window.location.reload();
    }

    // 處理擴充功能重新載入的情況
    window.addEventListener('unload', () => {
        try {
            chrome.runtime.sendMessage({ action: 'contentScriptUnloading' });
        } catch (e) {
            // 忽略錯誤，因為擴充功能可能已經被卸載
        }
    });

    // 監控 DOM 變化，為新加載的影片應用音量設置和添加滑桿
    let observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.tagName === 'VIDEO') {
                    if (node.parentElement) {
                        if (window.location.hostname.includes('facebook.com')) {
                            setSavedFbVolume();
                        } else if (window.location.hostname.includes('instagram.com')) {
                            setSavedIgVolume();
                        }
                    }
                } else if (node.querySelectorAll) {
                    let videos = node.querySelectorAll('video');
                    videos.forEach(video => {
                        if (window.location.hostname.includes('facebook.com')) {
                            setSavedFbVolume();
                        } else if (window.location.hostname.includes('instagram.com')) {
                            setSavedIgVolume();
                        }
                    });
                }
            });
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
})();
