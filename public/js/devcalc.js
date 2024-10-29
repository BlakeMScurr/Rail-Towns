async function f() {
    // Get the image and canvas elements
    const canvas = document.getElementById('overviewCanvas');
    const ctx = canvas.getContext('2d');

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    
    var promise = await fetch("/assets/boundaries/wingatui.json")
    var data = await promise
    var multi_shapes = await data.json()

    var selected_shape = 16;

    function render_detail() {
        const canvas = document.getElementById('detailCanvas');
        const ctx = canvas.getContext('2d');
    
        ctx.fillStyle = 'blue';
        ctx.fillRect(10,10, 30, 40);
    }

    render_detail()
    
    corner_1 = [170.37331306790603, -45.86717048147928]
    corner_2 = [170.40074611871748, -45.886132291960315]

    x_factor = Math.abs(corner_1[0] - corner_2[0])
    y_factor = Math.abs(corner_1[1] - corner_2[1])

    latitude_to_canvas = (point) => {
        const translated = [point[0] - corner_1[0], point[1] - corner_2[1]]
        const normalised = [translated[0] / x_factor, translated[1] / y_factor]
        const stretched = [normalised[0] * canvas.width, normalised[1] * canvas.width]
        const inverted = [stretched[0], canvas.height - stretched[1]]
        return inverted
    }

    canvas_to_latitude = (point) => {
        const inverted = [point[0], canvas.height - point[1]]
        const normalised = [inverted[0] / canvas.width, inverted[1] / canvas.width]
        const stretched = [normalised[0] * x_factor, normalised[1] * y_factor]
        const translated = [stretched[0] + corner_1[0], stretched[1] + corner_2[1]]
        return translated
    }

    multi_shapes = multi_shapes.map(multi_shape => {
        return multi_shape.map(nest => {
            return nest.map(shape => {
                return shape.map(point => {
                    return latitude_to_canvas(point)
                })
            })
        })
    })

    ctx.strokeStyle = 'rgb(0, 150, 255)';
    ctx.lineWidth = 0.5;

    outline_multishape = (multi_shape) => {
        multi_shape.forEach(shape => {
            make_shape(shape)
            ctx.stroke();
        })
    }

    fill_multishape = (multi_shape) => {
        multi_shape.forEach(shape => {
            make_shape(shape)
            ctx.fill();
        })
    }

    make_shape = (shape) => {
        ctx.beginPath();
        ctx.moveTo(shape[shape.length-1][0], shape[shape.length-1][1]);
        shape.forEach((line) => {
            line.forEach((point) => {
                ctx.lineTo(point[0], point[1]);
            })
        })
        ctx.closePath();
        ctx.stroke();
    }


    drawSelected = () => {
        ctx.fillStyle = "rgba(255, 129, 126, 1)"
        fill_multishape(multi_shapes[selected_shape])
        outline_multishape(multi_shapes[selected_shape])
    }


    multi_shapes.forEach(multi_shape => {
        outline_multishape(multi_shape)
    })

    drawSelected()

    
    var hovered_multishape = -1;
    drawHighlighting = (new_hovered) => {
        var is_new = false
        if (hovered_multishape != new_hovered) {
            if (hovered_multishape != -1) {
                ctx.globalCompositeOperation = 'destination-out';
                ctx.fillStyle = "rgba(0, 0, 0, 1)"
                fill_multishape(multi_shapes[hovered_multishape])
                ctx.globalCompositeOperation = "source-over";
                if (hovered_multishape != selected_shape) {
                    outline_multishape(multi_shapes[hovered_multishape])
                } else {
                    drawSelected()
                }
            }

            hovered_multishape = new_hovered
            is_new = true
        }

        if (hovered_multishape != -1) {
            if (is_new) {
                document.body.style.cursor = 'pointer';
                ctx.fillStyle = "rgb(0, 150, 255, 0.4)"
                fill_multishape(multi_shapes[hovered_multishape])
            }
        } else {
            document.body.style.cursor = 'default';
        }
    }

    const multi_shape_contains_point = (multi_shape, point) => {
        for (let s = 0; s < multi_shape.length; s++) {
            const shape = multi_shape[s];
            for (let l = 0; l < shape.length; l++) {
                const line = shape[l];
                var intersection_count = 0;
                for (let i = 0; i < line.length; i++) {
                    const a = line[i];
                    const b = line[(i+1)%line.length];
                    if (doIntersect(new Point(point[0], point[1]), new Point(point[0], -100000), new Point(a[0], a[1]), new Point(b[0], b[1]))) {
                        intersection_count++
                    }
                }
                if (intersection_count % 2 == 1) {
                    return true
                }
            }
        }
    }

    canvas.addEventListener('click', (event) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = (event.clientX - rect.left);
        const mouseY = (event.clientY - rect.top)
        const point = [mouseX, mouseY];

        for (let i = 0; i < multi_shapes.length; i++) {
            if (multi_shape_contains_point(multi_shapes[i], point)) {
                ctx.globalCompositeOperation = 'destination-out';
                ctx.fillStyle = "rgba(0, 0, 0, 1)"
                fill_multishape(multi_shapes[selected_shape])
                ctx.globalCompositeOperation = "source-over";
                selected_shape = i
                drawSelected()
                return
            }
        }
    }) 

    canvas.addEventListener('mousemove', (event) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = (event.clientX - rect.left);
        const mouseY = (event.clientY - rect.top)
        const point = [mouseX, mouseY];

        if (hovered_multishape != -1 && multi_shape_contains_point(multi_shapes[hovered_multishape], point)) {
            drawHighlighting(hovered_multishape)
            return
        }

        var new_hovered = -1
        for (let i = 0; i < multi_shapes.length; i++) { // TODO: optimise this by checking neighbours first
            if (multi_shape_contains_point(multi_shapes[i], point)) {
                new_hovered = i
                break
            }
        }

        drawHighlighting(new_hovered)
    });

    canvas.addEventListener('mouseleave', (_) => {
        drawHighlighting(-1)
    })

    // TODO: zooming and panning

}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////// ----------- From https://www.geeksforgeeks.org/check-if-two-given-line-segments-intersect/ ----------- ////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
class Point 
{ 
    constructor(x, y) 
    { 
        this.x = x; 
            this.y = y; 
    } 
} 

// Given three collinear points p, q, r, the function checks if 
// point q lies on line segment 'pr' 
function onSegment(p, q, r) 
{ 
    if (q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) && 
        q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y)) 
    return true; 
    
    return false; 
} 

// To find orientation of ordered triplet (p, q, r). 
// The function returns following values 
// 0 --> p, q and r are collinear 
// 1 --> Clockwise 
// 2 --> Counterclockwise 
function orientation(p, q, r) 
{ 

    // See https://www.geeksforgeeks.org/orientation-3-ordered-points/ 
    // for details of below formula. 
    let val = (q.y - p.y) * (r.x - q.x) - 
            (q.x - p.x) * (r.y - q.y); 
    
    if (val == 0) return 0; // collinear 
    
    return (val > 0)? 1: 2; // clock or counterclock wise 
} 

// The main function that returns true if line segment 'p1q1' 
// and 'p2q2' intersect. 
function doIntersect(p1, q1, p2, q2) 
{
    // Find the four orientations needed for general and 
    // special cases 
    let o1 = orientation(p1, q1, p2); 
    let o2 = orientation(p1, q1, q2); 
    let o3 = orientation(p2, q2, p1); 
    let o4 = orientation(p2, q2, q1); 
    
    // General case 
    if (o1 != o2 && o3 != o4) 
        return true; 
    
    // Special Cases 
    // p1, q1 and p2 are collinear and p2 lies on segment p1q1 
    if (o1 == 0 && onSegment(p1, p2, q1)) return true; 
    
    // p1, q1 and q2 are collinear and q2 lies on segment p1q1 
    if (o2 == 0 && onSegment(p1, q2, q1)) return true; 
    
    // p2, q2 and p1 are collinear and p1 lies on segment p2q2 
    if (o3 == 0 && onSegment(p2, p1, q2)) return true; 
    
    // p2, q2 and q1 are collinear and q1 lies on segment p2q2 
    if (o4 == 0 && onSegment(p2, q1, q2)) return true; 
    
    return false; // Doesn't fall in any of the above cases 
} 

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

f()
