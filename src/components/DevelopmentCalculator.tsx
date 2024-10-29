export interface Props {}
import * as fs from 'fs';
  
export default function DevelopmentCalculator({}: Props) {
    const css = `
    #overlayCanvas {
        background: url(/assets/wingatui.webp);
        background-size: contain;
        aspect-ratio: 1;
        width: 100%;
        height: 100%;
    }`

    return <div>
        <style>
            {css}
        </style>

        <canvas id="overlayCanvas"></canvas>

        <script src="/js/devcalc.js"></script>
    </div>
}