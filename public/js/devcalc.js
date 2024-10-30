import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.169.0/three.module.min.js';

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

    var rendernewscene = () => {}

    function render_detail() {
        const detailCanvas = document.getElementById('detailCanvas');
        const overviewCanvas = document.getElementById('overviewCanvas');

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

        const renderer = new THREE.WebGLRenderer();
        renderer.setSize( overviewCanvas.width, overviewCanvas.height );
        detailCanvas.appendChild( renderer.domElement );

        const create_multishape = (multishape) => {
            const rawPath = multishape[0][0] // TODO: all parts, and why is this doulby nested?
            var lowest_x = Infinity;
            var lowest_y = Infinity;
            rawPath.forEach(point => {
                if (point[0] < lowest_x) {
                    lowest_x = point[0]
                }
                if (point[1] < lowest_y) {
                    lowest_y = point[1]
                }
            })

            const positivePath = rawPath.map((point) => [point[0] - lowest_x, point[1] - lowest_y])

            var highest_x = 0;
            var highest_y = 0;
            positivePath.forEach(point => {
                if (point[0] > highest_x) {
                    highest_x = point[0];
                }
                if (point[1] > highest_y) {
                    highest_y = point[1];
                }
            })
            
            const normalisedPath = positivePath.map((point) => [point[0]/highest_x, point[1]/highest_y])
            const path = normalisedPath.map((point) => [point[0]-0.5, point[1]-0.5])

            const depth = 0.5;

            const shape = new THREE.Shape();
            shape.moveTo(path[path.length-1][0], path[path.length-1][1]);
            path.forEach((point) => {
                shape.lineTo(point[0], point[1] );
            })

            const extrudeSettings = {
                steps: 1,
                depth: depth,
                bevelEnabled: false,
            };

            const geometry = new THREE.ExtrudeGeometry( shape, extrudeSettings );
            const solidMaterial = new THREE.MeshBasicMaterial( { color: "rgba(255, 0, 0, 0.5)" } );
            const wireMaterial = new THREE.MeshBasicMaterial( { color: 0x00ff00, wireframe: true } );
            return [new THREE.Mesh( geometry, solidMaterial ), new THREE.Mesh( geometry, wireMaterial )];
        }

        var shape;
        rendernewscene = () => {
            if (shape) {
                scene.remove(shape[0])
                scene.remove(shape[1])
            }
            shape = create_multishape(multi_shapes[selected_shape])
            scene.add(shape[0])
            scene.add(shape[1])
        }

        rendernewscene()

        const camera_distance = 2;

        camera.position.z = camera_distance;
        camera.position.y = -camera_distance;
        camera.rotation.x += Math.PI/4

        function animate() {
            shape[0].rotation.z += 0.01;
            shape[1].rotation.z += 0.01;
            renderer.render( scene, camera );
        }
        renderer.setAnimationLoop( animate );
    }

    render_detail()
    
    const corner_1 = [170.37331306790603, -45.86717048147928]
    const corner_2 = [170.40074611871748, -45.886132291960315]

    const x_factor = Math.abs(corner_1[0] - corner_2[0])
    const y_factor = Math.abs(corner_1[1] - corner_2[1])

    const latitude_to_canvas = (point) => {
        const translated = [point[0] - corner_1[0], point[1] - corner_2[1]]
        const normalised = [translated[0] / x_factor, translated[1] / y_factor]
        const stretched = [normalised[0] * canvas.width, normalised[1] * canvas.width]
        const inverted = [stretched[0], canvas.height - stretched[1]]
        return inverted
    }

    const canvas_to_latitude = (point) => {
        const inverted = [point[0], canvas.height - point[1]]
        const normalised = [inverted[0] / canvas.width, inverted[1] / canvas.width]
        const stretched = [normalised[0] * x_factor, normalised[1] * y_factor]
        const translated = [stretched[0] + corner_1[0], stretched[1] + corner_2[1]]
        return translated
    }

    var multi_shapes = multi_shapes.map(multi_shape => {
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

    const outline_multishape = (multi_shape) => {
        multi_shape.forEach(shape => {
            make_shape(shape)
            ctx.stroke();
        })
    }

    const fill_multishape = (multi_shape) => {
        multi_shape.forEach(shape => {
            make_shape(shape)
            ctx.fill();
        })
    }

    const make_shape = (shape) => {
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


    const drawSelected = () => {
        ctx.fillStyle = "#AA4A44"
        fill_multishape(multi_shapes[selected_shape])
        outline_multishape(multi_shapes[selected_shape])
    }


    multi_shapes.forEach(multi_shape => {
        outline_multishape(multi_shape)
    })

    drawSelected()

    
    var hovered_multishape = -1;
    const drawHighlighting = (new_hovered) => {
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
                rendernewscene()
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
