class Coefficient {
    constructor(startNode, stopNode, name, number) {
        this.start = startNode;
        this.stop = stopNode;
        this.name = name;
        this.num = number;
    }
};
class Edge {
    constructor(endNode, gain) {
        this.endNode = endNode;
        this.gain = gain;
    }
};
let table, rowIndex = 0, nodeList = [], nodeGraph = [];
function onBodyLoad() {
    /*let draw = SVG().addTo('body').size(300, 300);
    let rect = draw.rect(100, 100).attr({fill: '#f06'})*/
    table = document.getElementById('table');
}

function onSubmit() {
    //let signalFlowGraph = SVG('signalFlowGraph'); //regular vs new.
    //let links = signalFlowGraph.group(), markers = signalFlowGraph.group(), nodes = signalFlowGraph.group();   
    let rows = document.getElementById('table').rows;
    let len = rows.length, from, to, gain, data = [];
    let i=1;
    if (rows[i]) {
        from = parseInt(rows[i].children[1].children[0].value);
        to = rows[i].children[2].children[0].value;
        data.push({from: from.toString(), to:to});
    }
    while (to == from + 1 && rows[i]) {//while from's are consecutive, add nodes to the graph
        gain = rows[i].children[3].children[0].value;
        nodeList.push([new Edge(to, gain)]);//each index i of nodelist represents a node #.
        i++;
        if (rows[i]) {
            from = parseInt(rows[i].children[1].children[0].value);
            to = rows[i].children[2].children[0].value;
            data.push({from: from.toString(), to:to});
        }
    }
    let nodeNum = data.length;
    for (; i<len; i++) {//get the rest.
        from = parseInt(rows[i].children[1].children[0].value);//find('from').val();
        to = rows[i].children[2].children[0].value;//find('to').val();
        gain = rows[i].children[3].children[0].value;
        nodeList[from].push(new Edge(to, gain));
        data.push({from: from.toString(), to:to});
    }
    len = nodeList.length;
    drawChart(nodeNum, 'signalFlowGraph');
    //if did this in first while loop, would interrupt building of data struct
    //for input.
    /*for (i=0; i<len; i++) {
        //nodeList[i][0].graph vs nodeGraph.push()
        nodeGraph.push(signalFlowGraph.group());
    }*/
}

//add empty row to table
function addRow() {
    let html = `<tr>
    <td class='number'>${rowIndex}</td>
    <td><input type='text' class='from' value='${rowIndex+1}'></input></td>
    <td><input type='text' class='to' value='${rowIndex+2}'></td>
    <td><input type='text' class='gain' value='1'></input></td>
    </tr>`;
    $('#table').append(html);
    rowIndex++;
    
}
//deletes last row from tree
function removeLastRow() {
    let rows = $('#table tr');
    if (rows.length > 1) {
        rows.last().remove();
    }
}
//remove the row specified by the index in the input field #rowNum 
function removeRow() {
    let num = parseInt($('#rowNum').val());
    //$('tr').get(num).remove();
    /*let rows = $('#table').rows();
    let len = $('#table').rows().length;
    $('tr').each( function (index) {
        if (parseInt($(this).find('.number').value) {
            $(this).remove();
            break;
        }
    });*/
    let rows = document.getElementById('table').rows;
    let len = rows.length;
    for (let i=1; i<len; i++) {
        if (parseInt(rows[i].cells[0].innerHTML) == num) {
            //$('#table > tr').remove('tr');
            rows[i].remove();
            break;
        }
    }
}

//sets table html to default.
function removeAllRows() {
    $('#table').html(`<tr>
    <th>number</th>
    <th>from</th>
    <th>to</th>
    <th>gain</th>
  </tr>`);
}

function drawChart(nodeNum, id) {
    let startX = 5;
    let startY = 20;
    let color = '#000';
    let diameter = 5;
    let plotXWidth = 300;
    let yLineCorrection = 2.5;
    let xLineCorrection = 2.5;
    let xInterval = parseInt(plotXWidth/nodeNum);//parseInt(plotXWidth/nodeNum)
    let arrowXStartCoord = startX+parseInt(xInterval/2)+4;
    var draw = SVG().addTo('#'+id).size(plotXWidth, 130), last = nodeNum-1;
    for (let i=0; i<last; i++) {
        draw.circle(diameter).fill(color).move(startX+xInterval*i, startY);
        arrow(draw, color, arrowXStartCoord+xInterval*i, startY+yLineCorrection);
    }
    draw.circle(diameter).fill(color).move(startX+xInterval*last, startY);//last node won't have an arrow
    var line = draw.line(startX+xLineCorrection, startY+yLineCorrection, startX+xInterval*last+xLineCorrection, startY+yLineCorrection);//.move(20, 20);
    line.stroke({ color: color, width: 1, linecap: 'round' });
    //<path d="M 10 60 C 20 80, 40 80, 50 60" stroke="black" fill="transparent"></path>
    /*let path = draw.path("M 5 20 C 5 20, 40 80, 58 20");
    path.fill('none');//.move(20, 20);
    path.stroke({ color: color, width: 1, linecap: 'round', linejoin: 'round' });*/
}
function arrow(plot, color, xCoord, yCoord, pointsLeftward) {
    if (!pointsLeftward) {//arrow points rightward as default
        let top = plot.line(xCoord-5, yCoord-5, xCoord, yCoord);
        top.stroke({ color: color, width: 1, linecap: 'round' });
        bottom = plot.line(xCoord-5, yCoord+5, xCoord, yCoord);
        bottom.stroke({ color: color, width: 1, linecap: 'round' });
    }
    else {//arrow points leftward
        let top = plot.line(xCoord, yCoord, xCoord+5, yCoord-5);
        top.stroke({ color: color, width: 1, linecap: 'round' });
        bottom = plot.line(xCoord, yCoord, xCoord+5, yCoord+5);
        bottom.stroke({ color: color, width: 1, linecap: 'round' });
    }
}