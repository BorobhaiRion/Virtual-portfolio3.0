const canvas = document.getElementById('cmatrix-canvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const katakana = 'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズヅブプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン';
const latin = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const nums = '0123456789';
const defaultAlphabet = katakana + latin + nums;

const fontSize = 16;
const columns = canvas.width / fontSize;

const drops = [];
for (let i = 0; i < columns; i++) {
    drops[i] = 1;
}

function draw() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = fontSize + 'px monospace';

    // Get image rect if available
    const userImageRect = window.userImageRect;
    const baseColor = window.cmatrixColor || '#0F0'; // Default to green if not set
    const currentAlphabet = window.cmatrixAlphabet || defaultAlphabet; // Use custom alphabet if set

    for (let i = 0; i < drops.length; i++) {
        const text = currentAlphabet.charAt(Math.floor(Math.random() * currentAlphabet.length));
        const charX = i * fontSize;
        const charY = drops[i] * fontSize;

        if (userImageRect) {
            const imageCenterX = userImageRect.x + userImageRect.width / 2;
            const imageCenterY = userImageRect.y + userImageRect.height / 2;
            const imageRadius = userImageRect.width / 2; // Assuming width == height for rounded-full

            const borderThickness = 4; // from border-4
            const effectRadiusOffset = 5; // 5px radius to image border

            const innerEffectRadius = imageRadius + borderThickness;
            const outerEffectRadius = imageRadius + borderThickness + effectRadiusOffset;

            const distance = Math.sqrt(Math.pow(charX - imageCenterX, 2) + Math.pow(charY - imageCenterY, 2));

            if (distance >= innerEffectRadius && distance <= outerEffectRadius) {
                ctx.fillStyle = '#4B0082'; // Dark purple
            } else {
                ctx.fillStyle = baseColor; // Use base color
            }
        } else {
            ctx.fillStyle = baseColor; // Use base color if image rect not available
        }

        ctx.fillText(text, charX, charY);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
            drops[i] = 0;
        }
        drops[i]++;
    }
}

setInterval(draw, 50);

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // Recalculate columns on resize
    const columns = canvas.width / fontSize;
    drops.length = 0; // Clear existing drops
    for (let i = 0; i < columns; i++) {
        drops[i] = 1;
    }
    });