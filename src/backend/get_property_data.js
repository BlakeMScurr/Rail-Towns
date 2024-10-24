async function call_api(centre_x, centre_y, radius, max_results) {
    var geometry = true
    var key = "57cf56ae16a14a8eaa47f286730643ab" // get API key from browser by looking at the authorization header in network requests to the below url when clicking on a property here https://data.linz.govt.nz/layer/50804-nz-property-titles/
    var query = `https://data.linz.govt.nz/services/query/v1/vector.json/?v=1.2&layer=50804&x=${centre_x}&y=${centre_y}&radius=${radius}&max_results=${max_results}&geometry=${geometry}&with_field_names=true`

    var resp = await fetch(query, {
        method: 'get', 
        headers: new Headers({
            'Authorization': `key ${key}`, 
        }), 
    })
    
    json = await resp.json()
    return json

}

async function get_properties_in_square(centre_x, centre_y, length, depth) {
    // try the circle in which this square is inscribed
    var radius = Math.ceil(Math.sqrt(2 * Math.pow(length/2, 2)))
    var response = await call_api(centre_x, centre_y, radius, 100)
    var results = response.vectorQuery.layers['50804'].features

    // if there were too many results for the API to return, split the square into 4 and combine those results
    if (results.length === 100) {
        d = (length / 4) / 111111 // Transforms metres to degrees (assumes Earth is a perfect square and that both latitude and longitude can be converted this way)
        var NE = await get_properties_in_square(centre_x + d/4, centre_y + d/4, length/2, depth+1)
        var NW = await get_properties_in_square(centre_x + d/4, centre_y - d/4, length/2, depth+1)
        var SE = await get_properties_in_square(centre_x - d/4, centre_y + d/4, length/2, depth+1)
        var SW = await get_properties_in_square(centre_x - d/4, centre_y - d/4, length/2, depth+1)

        return new Map([...NE, ...NW, ...SE, ...SW])
    }
    var m = new Map();
    results.forEach((r) => {
        m.set(r.id, r)
    })
    return m
}

async function main() {
    var properties = await get_properties_in_square(170.37459682123404, -45.876531440172165, 20000, 0) // Eastern Wingatui
    // var properties = await get_properties_in_square(170.3877585369411, -45.877485899610825, 4000, 0) // Train Station
    console.log("[")
    properties = [...properties.values()]
    properties = properties.filter(p => p.geometry.type === 'MultiPolygon');

    properties.forEach((p, i) => {
        if (p.geometry.type == 'MultiPolygon') {
            console.log(JSON.stringify(p.geometry.coordinates, null, 2))
            if (i != properties.length - 1) {
                console.log(",")
            }
        } else {
            console.warn("Unknown geometry type ", p.geometry.type)
        }
    })
    console.log("]")
    
}

main()
