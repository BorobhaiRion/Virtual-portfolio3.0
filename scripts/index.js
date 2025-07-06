document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded');
    const preloader = document.getElementById('preloader');
    const content = document.getElementById('content');
    const loadingBar = document.getElementById('loading-bar');
    const loadingPercentage = document.getElementById('loading-percentage');

    const totalDuration = 2000; // 2 seconds
    let startTime = Date.now();

    const interval = setInterval(() => {
        const elapsedTime = Date.now() - startTime;
        const progress = Math.min(elapsedTime / totalDuration, 1); // Ensure progress doesn't exceed 1
        const percentage = Math.floor(progress * 100);

        console.log(`Progress: ${percentage}%`);

        if (loadingBar) {
            loadingBar.style.width = `${percentage}%`;
        }
        if (loadingPercentage) {
            loadingPercentage.textContent = `${percentage}%`;
        }

        if (progress >= 1) {
            console.log('Loading complete, hiding preloader');
            clearInterval(interval);
            if (preloader) {
                preloader.style.display = 'none';
            }
            if (content) {
                content.classList.remove('hidden');
            }
        }
    }, 50); // Update every 50 milliseconds
});