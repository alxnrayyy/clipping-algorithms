
// Алгоритм Сазерленда-Коэна для отсечения отрезков
class CohenSutherland {
    constructor() {
        this.INSIDE = 0;   // 0000
        this.LEFT = 1;     // 0001
        this.RIGHT = 2;    // 0010
        this.BOTTOM = 4;   // 0100
        this.TOP = 8;      // 1000
    }

    // Вычисление кода региона для точки
    computeCode(x, y, clip) {
        let code = this.INSIDE;
        
        if (x < clip.xmin) {
            code |= this.LEFT;
        } else if (x > clip.xmax) {
            code |= this.RIGHT;
        }
        
        if (y < clip.ymin) {
            code |= this.BOTTOM;
        } else if (y > clip.ymax) {
            code |= this.TOP;
        }
        
        return code;
    }

    // Основная функция отсечения
    clipLine(x1, y1, x2, y2, clip) {
        let code1 = this.computeCode(x1, y1, clip);
        let code2 = this.computeCode(x2, y2, clip);
        let accept = false;

        while (true) {
            if ((code1 === 0) && (code2 === 0)) {
                // Оба конца внутри окна
                accept = true;
                break;
            } else if (code1 & code2) {
                // Оба конца снаружи в одной области
                break;
            } else {
                // Некоторые отрезки могут быть внутри
                let code_out = code1 !== 0 ? code1 : code2;
                let x, y;

                // Находим точку пересечения
                if (code_out & this.TOP) {
                    // Точка выше окна
                    x = x1 + (x2 - x1) * (clip.ymax - y1) / (y2 - y1);
                    y = clip.ymax;
                } else if (code_out & this.BOTTOM) {
                    // Точка ниже окна
                    x = x1 + (x2 - x1) * (clip.ymin - y1) / (y2 - y1);
                    y = clip.ymin;
                } else if (code_out & this.RIGHT) {
                    // Точка справа от окна
                    y = y1 + (y2 - y1) * (clip.xmax - x1) / (x2 - x1);
                    x = clip.xmax;
                } else if (code_out & this.LEFT) {
                    // Точка слева от окна
                    y = y1 + (y2 - y1) * (clip.xmin - x1) / (x2 - x1);
                    x = clip.xmin;
                }

                // Заменяем точку outside точкой пересечения
                if (code_out === code1) {
                    x1 = x;
                    y1 = y;
                    code1 = this.computeCode(x1, y1, clip);
                } else {
                    x2 = x;
                    y2 = y;
                    code2 = this.computeCode(x2, y2, clip);
                }
            }
        }

        if (accept) {
            return {
                x1: Math.round(x1),
                y1: Math.round(y1),
                x2: Math.round(x2),
                y2: Math.round(y2),
                visible: true
            };
        }
        return { visible: false };
    }
}

// Алгоритм Сазерленда-Ходжмена для отсечения выпуклого многоугольника
class SutherlandHodgman {
    // Основная функция отсечения многоугольника
    clipPolygon(subjectPolygon, clipPolygon) {
        let outputList = subjectPolygon;
        
        // Последовательно отсекаем против каждой границы отсекающего многоугольника
        for (let i = 0; i < clipPolygon.length; i++) {
            const clipEdgeStart = clipPolygon[i];
            const clipEdgeEnd = clipPolygon[(i + 1) % clipPolygon.length];
            
            outputList = this.clipAgainstEdge(outputList, clipEdgeStart, clipEdgeEnd);
            
            if (outputList.length === 0) {
                break; // Многоугольник полностью отсечен
            }
        }
        
        return outputList;
    }

    // Отсечение против одного ребра
    clipAgainstEdge(inputList, edgeStart, edgeEnd) {
        const outputList = [];
        const edgeVector = {
            x: edgeEnd.x - edgeStart.x,
            y: edgeEnd.y - edgeStart.y
        };

        for (let i = 0; i < inputList.length; i++) {
            const currentPoint = inputList[i];
            const nextPoint = inputList[(i + 1) % inputList.length];

            const currentInside = this.isInside(currentPoint, edgeStart, edgeEnd);
            const nextInside = this.isInside(nextPoint, edgeStart, edgeEnd);

            if (currentInside && nextInside) {
                // Обе точки внутри - добавляем следующую точку
                outputList.push(nextPoint);
            } else if (currentInside && !nextInside) {
                // Только текущая точка внутри - добавляем точку пересечения
                const intersection = this.computeIntersection(
                    currentPoint, nextPoint, edgeStart, edgeEnd
                );
                outputList.push(intersection);
            } else if (!currentInside && nextInside) {
                // Только следующая точка внутри - добавляем точку пересечения и следующую точку
                const intersection = this.computeIntersection(
                    currentPoint, nextPoint, edgeStart, edgeEnd
                );
                outputList.push(intersection);
                outputList.push(nextPoint);
            }
            // Если обе точки снаружи - не добавляем ничего
        }

        return outputList;
    }

    // Проверка, находится ли точка внутри ребра отсечения
    isInside(point, edgeStart, edgeEnd) {
        // Векторное произведение для определения положения точки относительно ребра
        const crossProduct = (edgeEnd.x - edgeStart.x) * (point.y - edgeStart.y) -
                           (edgeEnd.y - edgeStart.y) * (point.x - edgeStart.x);
        
        // Для выпуклого многоугольника точка внутри, если векторное произведение >= 0
        return crossProduct >= 0;
    }

    // Вычисление точки пересечения двух отрезков
    computeIntersection(p1, p2, edgeStart, edgeEnd) {
        const A1 = p2.y - p1.y;
        const B1 = p1.x - p2.x;
        const C1 = A1 * p1.x + B1 * p1.y;

        const A2 = edgeEnd.y - edgeStart.y;
        const B2 = edgeStart.x - edgeEnd.x;
        const C2 = A2 * edgeStart.x + B2 * edgeStart.y;

        const determinant = A1 * B2 - A2 * B1;

        if (Math.abs(determinant) < 1e-10) {
            // Параллельные линии
            return p1;
        }

        const x = (B2 * C1 - B1 * C2) / determinant;
        const y = (A1 * C2 - A2 * C1) / determinant;

        return { x: Math.round(x), y: Math.round(y) };
    }
}

// Вспомогательный класс для работы с прямоугольным окном
class RectangleClipper {
    // Преобразование прямоугольного окна в многоугольник для алгоритма Сазерленда-Ходжмена
    static rectangleToPolygon(clipWindow) {
        return [
            { x: clipWindow.xmin, y: clipWindow.ymin },
            { x: clipWindow.xmax, y: clipWindow.ymin },
            { x: clipWindow.xmax, y: clipWindow.ymax },
            { x: clipWindow.xmin, y: clipWindow.ymax }
        ];
    }
}
