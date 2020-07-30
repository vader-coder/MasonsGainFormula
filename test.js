function saveFile() {
    var blob = new Blob(["Hello, world!"], {type: "text/plain;charset=utf-8"});
    saveAs(blob, "hello world.txt");//FileSaver.
}
function drawChart() {
    let startX = 5;
    let startY = 40;
    let color = '#000';
    let diameter = 5;
    let nodeNum = 6, plotXWidth = 300;
    let yLineCorrection = 2.5;
    let xLineCorrection = 2.5;
    let xInterval = parseInt(plotXWidth/nodeNum);//parseInt(plotXWidth/nodeNum)
    let arrowXStartCoord = startX+parseInt(xInterval/2)+4;
    var draw = SVG().addTo('.graph').size(plotXWidth, 130);
    var rect = draw.circle(diameter).fill(color).move(startX, startY);
    draw.circle(diameter).fill(color).move(startX+xInterval, startY); 
    draw.circle(diameter).fill(color).move(startX+xInterval*2, startY); 
    draw.circle(diameter).fill(color).move(startX+xInterval*3, startY); 
    draw.circle(diameter).fill(color).move(startX+xInterval*4, startY); 
    draw.circle(diameter).fill(color).move(startX+xInterval*5, startY); 
    var line = draw.line(startX+xLineCorrection, startY+yLineCorrection, startX+xInterval*5+xLineCorrection, startY+yLineCorrection);//.move(20, 20);
    line.stroke({ color: color, width: 1, linecap: 'round' });
    arrow(draw, color, arrowXStartCoord, startY+yLineCorrection);
    arrow(draw, color, arrowXStartCoord+xInterval, startY+yLineCorrection);
    arrow(draw, color, arrowXStartCoord+xInterval*2, startY+yLineCorrection);
    arrow(draw, color, arrowXStartCoord+xInterval*3, startY+yLineCorrection);
    arrow(draw, color, arrowXStartCoord+xInterval*4, startY+yLineCorrection);
    //<path d="M 10 60 C 20 80, 40 80, 50 60" stroke="black" fill="transparent"></path>
    //M startX, startY C leftSlopeX leftSlopeY, rightSlopeX rightSlopeY, stopX stopY
    // |slope| = abs((leftSlopeY - startY)/(leftSlopeX - startX)) = abs((rightSlopeY-stopY)/(rightSlopeX - stopX))
    //  (80 - 60) / (20 - 10) = 20/10 = 2, (80 - 60)/(50 - 60) = 20 / -10 = -2. downward one.
    //forward will be up, backwards will be down. 
    getPath([10, 60], [50, 60], 2, 0);
    //"M 10 60 C 20 80, 40 80, 50 60", 
    // 20 * 2 = 40
    //"M 5 20 C 5 20, 40 80, 58 20"
    //up: M 10 20 C 20 10, 40 10, 50 20
    drawPath(draw, [startX+xInterval*2, startY], [startX+xInterval*4, startY], 20, 1);
    let middleX = startX+xInterval*2+((startX+xInterval*4)-(startX+xInterval*2))/2;
    //drawPath(draw, [5, startY], [58, startY], 20, 1);
    //arrow(draw,'#000', arrowXStartCoord, 25);
    arrow(draw,'#000', middleX, 25, 0);

}
function drawPath(draw, startPoint, stopPoint, slopeMag, isOverLine) {
    let pathInput = getPath(startPoint, stopPoint, slopeMag, isOverLine);
    let path = draw.path(pathInput);
    path.fill('none');//.move(20, 20);
    path.stroke({ color: '#000', width: 1, linecap: 'round', linejoin: 'round' });
}
//returns string describing path of a loop.
//point[0] is x-coordinate, point[1] is y coordinate.
function getPath(startPoint, stopPoint, slopeMag = 20, isOverLine) {
    let rightPoint = [], leftPoint = [], ret, xInterval = 1, leftX, rightX, sign = 1;
    //let slopeMag = changeMag;
    leftX = startPoint[0]+xInterval;
    rightX = stopPoint[0]-xInterval;
    if (isOverLine) {//loop above horizontal line of nodes.
        sign = -1;
    }
    let yIntercept = startPoint[1];// - startPoint[0]*slopeMag;
    leftPoint = [leftX, yIntercept + sign*slopeMag*xInterval];//startPoint[1]-changeMag];
    rightPoint = [rightX, yIntercept + sign*slopeMag*xInterval];//stopPoint[1]-changeMag];
    ret = `M ${startPoint[0]} ${startPoint[1]} C ${leftPoint[0]} ${leftPoint[1]}, ${rightPoint[0]} ${rightPoint[1]}, ${stopPoint[0]} ${stopPoint[1]}`;
    return ret;
}
//generates an arrow for plot at coordinates xCoord, yCoord
function arrow(plot, color = '#000', xCoord, yCoord, pointsRightward = 1) {
    if (pointsRightward) {//arrow points rightward as default
        let top = plot.line(xCoord-5, yCoord-5, xCoord, yCoord);
        top.stroke({color: color, width: 1, linecap: 'round'});
        bottom = plot.line(xCoord-5, yCoord+5, xCoord, yCoord);
        bottom.stroke({color: color, width: 1, linecap: 'round'});
    }
    else {//arrow points leftward
        xCoord -= 5;
        let top = plot.line(xCoord, yCoord, xCoord+5, yCoord-5);
        top.stroke({ color: color, width: 1, linecap: 'round' });
        bottom = plot.line(xCoord, yCoord, xCoord+5, yCoord+5);
        bottom.stroke({ color: color, width: 1, linecap: 'round' });
    }
}