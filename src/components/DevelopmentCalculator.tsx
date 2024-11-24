export interface Props {}
  
export default function DevelopmentCalculator({}: Props) {
    // TODO: what's overriding these important attributes?
    const css = `
    @media (max-width: 800px) {
        canvas {
            width: 100% !important;
            height: 100% !important;
        }
    }

    @media (min-width: 800px) {
        canvas {
            width: 50% !important;
            height: 50% !important;
        }
    }

    canvas {
        aspect-ratio: 1;
        display: inline-block !important;
    }

    #address {
        text-align: center;
    }`

    return <div>
        <style>
            {css}
        </style>

        <canvas id="overviewCanvas"></canvas>
        <div id="detailCanvas"></div>
        <h3 id="address"></h3>

        <script type="module" src="/js/intersections.mjs"></script>
        <script type="module" src="/js/property.mjs"></script>
        <script type="module" src="/js/haversine.mjs"></script>
        <script type="module" src="/js/devcalc.js"></script>
    </div>
}