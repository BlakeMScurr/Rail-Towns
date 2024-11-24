import { doIntersect, Point } from '/js/intersections.mjs';

function latitude_to_canvas(point, canvasWidth, canvasHeight, canvasCorner1, canvasCorner2) {
    const x_factor = Math.abs(canvasCorner1[0] - canvasCorner2[0])
    const y_factor = Math.abs(canvasCorner1[1] - canvasCorner2[1])

    const translated = [point[0] - canvasCorner1[0], point[1] - canvasCorner2[1]]
    const normalised = [translated[0] / x_factor, translated[1] / y_factor]
    const stretched = [normalised[0] * canvasWidth, normalised[1] * canvasWidth]
    const inverted = [stretched[0], canvasHeight - stretched[1]]
    return inverted
}

function resizeToCanvas(property, canvasWidth, canvasHeight, canvasCorner1, canvasCorner2) {
    return property.latLongBoundaries.map(nest => {
        return nest.map(shape => {
            return shape.map(point => {
                return latitude_to_canvas(point, canvasWidth, canvasHeight, canvasCorner1, canvasCorner2)
            })
        })
    })
}

export class Property {
    constructor(address, latLongBoundaries, canvasWidth, canvasHeight, canvasCorner1, canvasCorner2) {
        this.address = address;
        this.latLongBoundaries = latLongBoundaries;
        this.canvasCorner1 = canvasCorner1
        this.canvasCorner2 = canvasCorner2
        this.canvasBoundaries = resizeToCanvas(this, canvasWidth, canvasHeight, this.canvasCorner1, this.canvasCorner2)
    }

    resizeToCanvas(canvasWidth, canvasHeight) {
        this.canvasBoundaries = resizeToCanvas(this, canvasWidth, canvasHeight, this.canvasCorner1, this.canvasCorner2)
    }

    // runs raytracing algorithm
    // expects points defined by canvas dimensions
    contains(point) {
        for (let s = 0; s < this.canvasBoundaries.length; s++) {
            const shape = this.canvasBoundaries[s];
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

    getNormalised() {
        var lowest_x = Infinity;
        var lowest_y = Infinity;

        this.latLongBoundaries.forEach((shape) => {
            shape[0].forEach(point => { // TODO: why does this extra nesting seem to only be relevant here?
                if (point[0] < lowest_x) {
                    lowest_x = point[0]
                }
                if (point[1] < lowest_y) {
                    lowest_y = point[1]
                }
            })
        })

        var deg_per_su = 0;
        this.latLongBoundaries.map((shape) => {
            const rawPath = shape[0]
            const positivePath = rawPath.map((point) => [point[0] - lowest_x, point[1] - lowest_y])
            positivePath.forEach(point => {
                if (point[0] > deg_per_su) {
                    deg_per_su = point[0];
                }
                if (point[1] > deg_per_su) {
                    deg_per_su = point[1];
                }
            })
        })

        const transform = (property) => {
            return property.latLongBoundaries.map((shape) => {
                const rawPath = shape[0]
                const positivePath = rawPath.map((point) => [point[0] - lowest_x, point[1] - lowest_y])
                const normalisedPath = positivePath.map((point) => [point[0]/deg_per_su, point[1]/deg_per_su])
                return normalisedPath.map((point) => [point[0]-0.5, point[1]-0.5])
            })
        }

        return [transform(this), deg_per_su, transform];
    }   
}
