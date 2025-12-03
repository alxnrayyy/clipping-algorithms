class ClippingApp {
    constructor() {
        this.canvas = document.getElementById('mainCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.lines = [];
        this.clipWindow = null;
        this.subjectPolygon = [];
        
        this.cohenSutherland = new CohenSutherland();
        this.sutherlandHodgman = new SutherlandHodgman();
        
        this.setupEventListeners();
        this.loadExample();
    }

    setupEventListeners() {
        // Обработчики для кнопок
        document.getElementById('loadExampleBtn').addEventListener('click', () => {
            this.loadExample();
        });

        document.getElementById('clearCanvasBtn').addEventListener('click', () => {
            this.clearCanvas();
        });

        document.getElementById('loadPolygonBtn').addEventListener('click', () => {
            this.loadPolygonExample();
        });

        document.getElementById('cohenSutherlandBtn').addEventListener('click', () => {
            this.runCohenSutherland();
        });

        document.getElementById('polygonClippingBtn').addEventListener('click', () => {
            this.runPolygonClipping();
        });

        document.getElementById('fileInput').addEventListener('change', (e) => {
            this.loadFromFile(e.target.files[0]);
        });
    }

    parseInputData(text) {
        const lines = text.trim().split('\n');
        const n = parseInt(lines[0]);
        
        this.lines = [];
        for (let i = 1; i <= n; i++) {
            const coords = lines[i].trim().split(/\s+/).map(Number);
            if (coords.length === 4) {
                this.lines.push({
                    x1: coords[0], y1: coords[1],
                    x2: coords[2], y2: coords[3]
                });
            }
        }
        
        // Последняя строка - отсекающее окно
        const clipCoords = lines[lines.length - 1].trim().split(/\s+/).map(Number);
        if (clipCoords.length === 4) {
            this.clipWindow = {
                xmin: clipCoords[0], ymin: clipCoords[1],
                xmax: clipCoords[2], ymax: clipCoords[3]
            };
        }
    }

    loadExample() {
        const exampleData = document.getElementById('inputData').value;
        this.parseInputData(exampleData);
        this.drawScene();
        
        this.showAlgorithmInfo(
            "Пример загружен",
            "Загружены тестовые отрезки и отсекающее окно. Нажмите 'Запустить отсечение отрезков' для визуализации алгоритма Сазерленда-Коэна."
        );
    }

    loadPolygonExample() {
        // Создаем тестовый выпуклый многоугольник (шестиугольник)
        const centerX = 150;
        const centerY = 150;
        const radius = 80;
        this.subjectPolygon = [];
        
        for (let i = 0; i < 6; i++) {
            const angle = (i * 2 * Math.PI / 6) - Math.PI / 2;
            this.subjectPolygon.push({
                x: centerX + radius * Math.cos(angle),
                y: centerY + radius * Math.sin(angle)
            });
        }
        
        // Устанавливаем отсекающее окно если его нет
        if (!this.clipWindow) {
            this.clipWindow = { xmin: 50, ymin: 50, xmax: 200, ymax: 200 };
        }
        
        this.drawScene();
        this.drawPolygon(this.subjectPolygon, '#0000ff', false);
        
        this.showAlgorithmInfo(
            "Тестовый многоугольник загружен",
            `Шестиугольник с центром (${centerX}, ${centerY}) и радиусом ${radius}. Нажмите "Запустить отсечение многоугольника" для визуализации алгоритма.`
        );
    }

    async loadFromFile(file) {
        const text = await file.text();
        document.getElementById('inputData').value = text;
        this.parseInputData(text);
        this.drawScene();
        
        this.showAlgorithmInfo(
            "Файл загружен",
            "Данные из файла успешно загружены. Выберите алгоритм для выполнения отсечения."
        );
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.lines = [];
        this.clipWindow = null;
        this.subjectPolygon = [];
        document.getElementById('inputData').value = '';
        document.getElementById('results').innerHTML = '';
        document.getElementById('algorithmInfo').innerHTML = 'Выберите алгоритм для отображения информации...';
    }

    drawScene() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Рисуем систему координат
        this.drawCoordinateSystem();
        
        // Рисуем отсекающее окно
        if (this.clipWindow) {
            this.drawClipWindow();
        }
        
        // Рисуем исходные отрезки
        this.drawOriginalLines();
    }

    drawCoordinateSystem() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1;
        
        // Вертикальные линии
        for (let x = 0; x <= width; x += 50) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
            
            if (x > 0) {
                ctx.fillStyle = '#666';
                ctx.fillText(x, x - 10, height - 5);
            }
        }
        
        // Горизонтальные линии
        for (let y = 0; y <= height; y += 50) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
            
            if (y > 0) {
                ctx.fillStyle = '#666';
                ctx.fillText(y, 5, y - 5);
            }
        }
    }

    drawClipWindow() {
        const ctx = this.ctx;
        const clip = this.clipWindow;
        
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        
        ctx.strokeRect(clip.xmin, clip.ymin, clip.xmax - clip.xmin, clip.ymax - clip.ymin);
        
        // Подпись
        ctx.fillStyle = '#ff0000';
        ctx.fillText(`Окно: (${clip.xmin},${clip.ymin})-(${clip.xmax},${clip.ymax})`, 
                     clip.xmin, clip.ymin - 10);
    }

    drawOriginalLines() {
        const ctx = this.ctx;
        
        ctx.strokeStyle = '#0000ff';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        
        this.lines.forEach((line, index) => {
            ctx.beginPath();
            ctx.moveTo(line.x1, line.y1);
            ctx.lineTo(line.x2, line.y2);
            ctx.stroke();
            
            // Подписи для отрезков
            ctx.fillStyle = '#0000ff';
            const midX = (line.x1 + line.x2) / 2;
            const midY = (line.y1 + line.y2) / 2;
            ctx.fillText(`L${index + 1}`, midX, midY - 10);
        });
    }

    drawClippedLine(line, color = '#00ff00') {
        const ctx = this.ctx;
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.setLineDash([]);
        
        ctx.beginPath();
        ctx.moveTo(line.x1, line.y1);
        ctx.lineTo(line.x2, line.y2);
        ctx.stroke();
        
        // Маркеры для концов отрезка
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(line.x1, line.y1, 4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(line.x2, line.y2, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    drawPolygon(polygon, color, fill = false) {
        const ctx = this.ctx;
        
        if (polygon.length < 2) return;
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        
        ctx.beginPath();
        ctx.moveTo(polygon[0].x, polygon[0].y);
        
        for (let i = 1; i < polygon.length; i++) {
            ctx.lineTo(polygon[i].x, polygon[i].y);
        }
        
        ctx.closePath();
        
        if (fill) {
            ctx.fillStyle = color + '40'; // Полупрозрачная заливка
            ctx.fill();
        }
        
        ctx.stroke();
        
        // Рисуем вершины
        ctx.fillStyle = color;
        polygon.forEach((point, index) => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
            ctx.fill();
            
            // Номера вершин
            ctx.fillText(`${index}`, point.x + 5, point.y - 5);
        });
    }

    runCohenSutherland() {
        if (!this.clipWindow || this.lines.length === 0) {
            alert("Сначала загрузите данные с отрезками!");
            return;
        }

        this.showAlgorithmInfo(
            "Алгоритм Сазерленда-Коэна",
            "Алгоритм использует коды регионов для определения видимости отрезков. " +
            "Каждому концу отрезка присваивается 4-битный код, определяющий его положение относительно отсекающего окна. " +
            "Алгоритм последовательно проверяет коды и находит точки пересечения отрезка с границами окна."
        );
        this.performLineClipping();
    }

    runPolygonClipping() {
        if (this.subjectPolygon.length === 0) {
            alert("Сначала загрузите тестовый многоугольник!");
            return;
        }
        
        this.showAlgorithmInfo(
            "Алгоритм Сазерленда-Ходжмена для отсечения выпуклого многоугольника",
            "Алгоритм последовательно отсекает многоугольник против каждой границы отсекающего окна. " +
            "Для каждой границы создается новый многоугольник, содержащий только видимые части. " +
            "Работает с любыми выпуклыми отсекающими областями."
        );
        
        this.performPolygonClipping();
    }

    performLineClipping() {
        this.drawScene();
        let results = [];
        let visibleCount = 0;
        
        this.lines.forEach((line, index) => {
            const clippedLine = this.cohenSutherland.clipLine(
                line.x1, line.y1, line.x2, line.y2, this.clipWindow
            );
            
            if (clippedLine.visible) {
                this.drawClippedLine(clippedLine);
                results.push(`✓ Отрезок ${index + 1}: видимая часть (${clippedLine.x1}, ${clippedLine.y1}) - (${clippedLine.x2}, ${clippedLine.y2})`);
                visibleCount++;
            } else {
                results.push(`✗ Отрезок ${index + 1}: полностью невидим`);
            }
        });
        
        results.unshift(`Результат: ${visibleCount} из ${this.lines.length} отрезков видимы`);
        this.showResults(results);
    }

    performPolygonClipping() {
        this.drawScene();
        
        // Преобразуем прямоугольное окно в многоугольник
        const clipPolygon = RectangleClipper.rectangleToPolygon(this.clipWindow);
        
        // Рисуем исходный многоугольник
        this.drawPolygon(this.subjectPolygon, '#0000ff', true);
        
        // Рисуем отсекающее окно как многоугольник
        this.drawPolygon(clipPolygon, '#ff0000', false);
        
        // Выполняем отсечение
        const clippedPolygon = this.sutherlandHodgman.clipPolygon(this.subjectPolygon, clipPolygon);
        
        // Рисуем отсеченный многоугольник
        this.drawPolygon(clippedPolygon, '#00ff00', true);
        
        const area = this.calculatePolygonArea(clippedPolygon);
        const perimeter = this.calculatePolygonPerimeter(clippedPolygon);
        
        this.showResults([
            `Исходный многоугольник: ${this.subjectPolygon.length} вершин`,
            `Отсеченный многоугольник: ${clippedPolygon.length} вершин`,
            `Площадь отсеченной части: ${area.toFixed(1)}`,
            `Периметр отсеченной части: ${perimeter.toFixed(1)}`,
            `Эффективность отсечения: ${((area / this.calculatePolygonArea(this.subjectPolygon)) * 100).toFixed(1)}%`
        ]);
    }

    calculatePolygonArea(polygon) {
        if (polygon.length < 3) return 0;
        
        let area = 0;
        const n = polygon.length;
        
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            area += polygon[i].x * polygon[j].y;
            area -= polygon[j].x * polygon[i].y;
        }
        
        return Math.abs(area) / 2;
    }

    calculatePolygonPerimeter(polygon) {
        if (polygon.length < 2) return 0;
        
        let perimeter = 0;
        const n = polygon.length;
        
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            const dx = polygon[j].x - polygon[i].x;
            const dy = polygon[j].y - polygon[i].y;
            perimeter += Math.sqrt(dx * dx + dy * dy);
        }
        
        return perimeter;
    }

    showAlgorithmInfo(title, description) {
        document.getElementById('algorithmInfo').innerHTML = `
            <h3>${title}</h3>
            <p>${description}</p>
        `;
    }

    showResults(results) {
        const resultsDiv = document.getElementById('results');
        resultsDiv.innerHTML = '<h4>Результаты отсечения:</h4>' +
            results.map(result => `<div>${result}</div>`).join('');
    }
}

// Инициализация приложения при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ClippingApp();
});