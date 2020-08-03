class Page {
    constructor() {
        this.fileSubmit = document.querySelector('#fileSubmit');
        this.tableSubmit = document.querySelector('#tableSubmit');
        this.inputTarget = document.querySelector('#content-target');
    }
}
class Node {
    constructor (value) {
        this.value = value;
        this.next = null;
        this.visited = 0;
    }
};
class Stack {
    constructor (value) {
        this.head = new Node(value);
    }
    pop() {
        let value;
        if (this.head) {
            value = this.head.value;
            this.head = this.head.next;
        } else {
            value = undefined;
        }
        return value;
    }
    push(value) {
        let newHead = new Node(value);
        newHead.next = this.head;
        this.head = newHead;
    }
    peek() {
        return (this.head ? this.head.value : undefined);
    }
};
class Edge {
    constructor(endNode, gain) {
        this.endNode = endNode;
        this.gain = gain;
    }
};
class Loop {
    constructor (from, toNode, adjacencyList) {
        this.from = from;
        this.to = toNode.endNode;
        this.gain = getLoopGain(toNode, from, adjacencyList);
    }
    isTouchingPath(path) {//takes array of nodes in path
        for (let i=this.to; i<=this.from; i++) {
            if (path.indexOf(i) > -1) {
                return 1;
            }
        }
        return 0;
    }
};
class LoopCollection {//collection of loops (non-touching.)
    constructor (loops, gain, determinant) {
        this.loops = loops;
        this.gain = gain;
        this.length = loops.length;
    }
}

let table, rowIndex = 0, nodeList = [], nodeGraph = [], masonsGainPage;
let blackHex = '#000', pinkHex = '#e75480 ';//'#ffc0cb';
function onBodyLoad() {
    /*let draw = SVG().addTo('body').size(300, 300);
    let rect = draw.rect(100, 100).attr({fill: '#f06'})*/
    table = document.getElementById('table');
    masonsGainPage = new Page();//might add table to page
    masonsGainPage.loopGraphs = document.getElementById('loopGraphs');
    masonsGainPage.nonTouchingLoopGraphs = document.getElementById('nonTouchingLoopGraphs');
    masonsGainPage.pathGraphs = document.getElementById('forwardPathGraphs');
    masonsGainPage.pathDesc = document.getElementById('totalGraphDesc');
    masonsGainPage.signalFlowGraph = document.getElementById('signalFlowGraph');
    masonsGainPage.determinantDesc = document.getElementById('determinantStr');
    masonsGainPage.numeratorHTML = document.getElementById('numeratorStr');
    document.getElementById('fileInput').addEventListener('change', fileHandler);
}
function fileHandler(event) {
    const input = event.target;//div that triggered the event. 
    if ('files' in input && input.files.length > 0) {
        let outputTarget = masonsGainPage.inputTarget;//global object, add.
        let file = input.files[0];
        const reader = new FileReader();
        let readContent = new Promise((resolve, reject) => {
            reader.onload = event => resolve(event.target.result);
            reader.onerror = error => reject(error);
            reader.readAsText(file);
        });
        readContent.then(content => {
            outputTarget.value = content
        }).catch(error => { throw new Error(error) } );
    }
}

function getLoopGain(toNode, from, adjacencyList) {
    let adjItem = adjacencyList[from], adjItemLen = adjacencyList[from].length, 
    gain = toNode.gain, to = toNode.endNode;
    let adjLen = adjacencyList.length, currentNode = to;
    //loop through adjacency list starting at 'to', 
    //find gain of all edges between 'to' and 'from' besides the backwards one
    //by default, 'gain' is set to gain of backwards edge. 
    for (let adjIndex=to; adjIndex<adjLen; adjIndex++) {
        adjItem = adjacencyList[adjIndex];
        adjItemLen = adjItem.length;
        for (let i=0; i<adjItemLen; i++) {
            if (adjItem[i].endNode == (currentNode+1)) {
                gain = gain.multiply(adjItem[i].gain);
                break;
            }
        }
        if (currentNode == from-1) {
            break;
        }
        else {
            currentNode++;
        }
    }
    return gain;
}

function getNodesFromTable() {
    let rows = document.getElementById('table').rows;
    let rowNum = rows.length, from, to, gain, data = [],
    nodeList = [];//used to include an empty one for indecies.
    let i=1, fileStr;//start i at 0 instead of 1?
    if (rows[i]) {//first one.
        from = parseInt(rows[i].children[1].children[0].value);
        to = parseInt(rows[i].children[2].children[0].value);
        gain = parseInt(rows[i].children[3].children[0].value);
        fileStr = `0 ${from} ${to} ${gain.toString()}`;
        //data.push({from: from.toString(), to:to.toString()});
    }
    while (to == from + 1 && rows[i]) {//while from's are consecutive, add nodes to the graph
        nodeList.push([new Edge(to, gain)]);//each index i of nodelist represents a node #.
        i++;
        if (rows[i]) {
            from = parseInt(rows[i].children[1].children[0].value);
            to = parseInt(rows[i].children[2].children[0].value);
            gain = parseInt(rows[i].children[3].children[0].value);
            fileStr += `${'\n'}${i-1} ${from} ${to} ${gain.toString()}`;
        }
    }
    let forwardNodeList = copyObject(nodeList);
    let lastNodeIndex = nodeList[nodeList.length-1][0].endNode;
    //let nodeNum = data.length;
    for (; i<rowNum; i++) {//get the rest.
        from = parseInt(rows[i].children[1].children[0].value);//find('from').val();
        to = parseInt(rows[i].children[2].children[0].value);//find('to').val();
        gain = parseInt(rows[i].children[3].children[0].value);
        fileStr += `${'\n'}${i-1} ${from} ${to} ${gain.toString()}`;
        nodeList[from].push(new Edge(to, gain));
        if (to > from) {//edge is forward, add to forwardNodeList
            forwardNodeList[from].push(new Edge(to, gain));//faster to copy or make your own?
        }//copyObject(nodeList[from][nodeList[from].length-1])
        //data.push({from: from.toString(), to:to.toString()});
    }
    masonsGainPage.fileStr = fileStr;
    return [nodeList, forwardNodeList, lastNodeIndex];
}
//uses a recursive function getForwardPath() to get the array of forward paths.
// forwardAdjacencyList is list of edges pruned of backward edges (loops). 
function getForwardPaths(forwardAdjacencyList, lastNodeIndex) {
    let pathArr = [];
    getForwardPath(0, [], nerdamer('1'), forwardAdjacencyList, pathArr, lastNodeIndex);
    return pathArr;
}
//use this on edge adjacencyList that has been pruned of loops to find forward paths. 
function getForwardPath(index, path, gain, adjacencyList, pathArr, lastNodeIndex) {
    path.push(index);
    if (index == lastNodeIndex) {//base case, we got to the end of the node.
        pathArr.push({path: path, gain: gain, len: path.length, determinant: 0});
        return;
    }
    let edge, forwardEdges = adjacencyList[index];
    let forwardEdgesNum = forwardEdges.length;
    for (let i=0; i<forwardEdgesNum; i++) {
        edge = forwardEdges[i];
        getForwardPath(edge.endNode, copyObject(path), gain.multiply(edge.gain), adjacencyList, pathArr, lastNodeIndex);
    }
}
//gets nodes & edges from file. store gains as nerdamer objects so can do arithmetic.
function getNodesFromFile() {
    masonsGainPage.fileStr = masonsGainPage.inputTarget.value;
    //string for contents of output file will be file that is uploaded if nodes are retreived from the file.
    let rows = masonsGainPage.inputTarget.value.split('\n');
    let rowNum = rows.length;
    let from, to, gain, nodeList = [];
    if (rows[rowNum-1].length == '' || rows[rowNum-1].length == ' ') {//take care of extra enter sign if it exists. 
        rows.pop();
        rowNum = rows.length;
    }
    for (let i=0; i<rowNum; i++) {
        rows[i] = rows[i].split(' ');//.map(n => parseInt(n));//replace string with list of numbers.
    }
    let i=0;
    if (rows[i]) {//first one.
        from = parseInt(rows[i][1]);
        to = parseInt(rows[i][2]);
        gain = nerdamer(rows[i][3]);
        //data.push({from: from.toString(), to:to.toString()});
    }
    while (to == from + 1 && rows[i]) {//while from's are consecutive, add nodes to the graph
        nodeList.push([new Edge(to, gain)]);//each index i of nodelist represents a node #.
        i++;
        if (rows[i]) {
            from = parseInt(rows[i][1]);
            to = parseInt(rows[i][2]);
            gain = nerdamer(rows[i][3]);
        }
    }
    let forwardNodeList = copyObject(nodeList);
    let lastNodeIndex = nodeList[nodeList.length-1][0].endNode;
    //let nodeNum = data.length;
    for (; i<rowNum; i++) {//get the edges connecting nonconsecutive nodes.
        from = parseInt(rows[i][1]);
        to = parseInt(rows[i][2]);
        gain = nerdamer(rows[i][3]);
        nodeList[from].push(new Edge(to, gain));
        if (to > from) {//edge is forward, add to forwardNodeList
            forwardNodeList[from].push(new Edge(to, gain));//faster to copy or make your own?
        }//copyObject(nodeList[from][nodeList[from].length-1])
    }
    return [nodeList, forwardNodeList, lastNodeIndex];
}
function saveFile(content) {
    var blob = new Blob([content], {type: "text/plain;charset=utf-8"});
    saveAs(blob, "graphEdges.txt");
}
function downloadEdgeFile() {
    if (masonsGainPage.fileStr) {
        saveFile(masonsGainPage.fileStr);       
    }
    else {
        saveFile('');
    }
}
function onSubmit() {//should we call this main()?
    let nodeList, forwardNodeList, lastNodeIndex;
    if (masonsGainPage.fileSubmit.checked) {
        [nodeList, forwardNodeList, lastNodeIndex] = getNodesFromFile();
    }
    else if (masonsGainPage.tableSubmit.checked) {
        [nodeList, forwardNodeList, lastNodeIndex] = getNodesFromTable();
    }
    else {
        alert('Submit Either With A File or The Table');
        return;
    }
    let loops = getLoops(nodeList);
    let pathArr = getForwardPaths(forwardNodeList, lastNodeIndex);
    //let loopList = getSetsOfCombinations(['a', 'b', 'c', 'd', 'e'], 3);
    masonsGainPage.loops = loops;
    masonsGainPage.nonTouchingLoops = [];//array of sets of non-touching loops.
    let nonTouchingLoops = masonsGainPage.nonTouchingLoops;
    masonsGainPage.numeratorStr = `$$\\sum_{k=1}^N  {G_k \\Delta _k} = `;
    masonsGainPage.numeratorDesc = ``;
    masonsGainPage.denominatorDesc = ``;
    masonsGainPage.denominatorStr = `&Delta; = 1 `;
    masonsGainPage.loopLabels = 'ijklmnopqrstuvwxyzabcdefghIGKLMNOPQRSTUVWXYZABCDEF';//might need to include a check. 
    masonsGainPage.determinant = getDeterminant(loops, 1);
    masonsGainPage.forwardPaths = pathArr;
    //arrange so only loop through this once.
    masonsGainPage.numerator = getMasonsNumerator(loops, masonsGainPage.forwardPaths);
    if (masonsGainPage.numeratorStr.indexOf('+') > -1) {//more than 1 element.
        masonsGainPage.numeratorStr += ` = ${masonsGainPage.numerator.toString()}$$`;
    }
    else {
        masonsGainPage.numeratorStr += `$$`;
    }
    masonsGainPage.denominatorStr += ` = ${masonsGainPage.determinant.toString()}`;
    masonsGainPage.finalGain = masonsGainPage.numerator.divide(masonsGainPage.determinant);
    
    //erase graphs from last time.
    masonsGainPage.loopGraphs.innerHTML = '';
    masonsGainPage.nonTouchingLoopGraphs.innerHTML = '';
    masonsGainPage.pathGraphs.innerHTML = '';
    masonsGainPage.pathDesc.innerHTML = '';
    masonsGainPage.signalFlowGraph.innerHTML = '';

    let nodeNum = nodeList.length+1;

    drawFullChart(nodeList, nodeNum, 'signalFlowGraph');
    masonsGainPage.pathDesc.innerHTML = `Total Signal Flow Graph Gain: ${masonsGainPage.finalGain.toString()}`;
    masonsGainPage.signalFlowGraph.scrollIntoView();
    let loopNum = loops.length;
    let pathNum = pathArr.length, bgColor;
    let loopBackGround1 = '#e8f4f8';
    let pathBackGround1 = '#FFE6EE';//pink //'#f7f7f7';//white smoke
    let pathBackGround2 = '#FAEBD7';//'#FFFDD0';//cream //'#FFFAFA'//snow
    let yCaption = `<div class="halfWidthEach"><div class="math"><div class="left">$$y_\\text{in}:$$</div></div><div></div></div><br>`;
    masonsGainPage.determinantDesc.innerHTML = yCaption+masonsGainPage.denominatorDesc+masonsGainPage.denominatorStr;
    masonsGainPage.numeratorHTML.innerHTML = `$$y_\\text{out}:$$` + masonsGainPage.numeratorDesc+masonsGainPage.numeratorStr;
    MathJax.typeset();//see if works when change it, otherwise would need promise.
    if (loopNum > 0) {
        for (let i=0; i<loopNum; i++) {
            if (i%2) {
                bgColor = pathBackGround1;
            }
            else {
                bgColor = loopBackGround1;
            }
            masonsGainPage.loopGraphs.insertAdjacentHTML('beforeend', `<div style='background-color: ${bgColor}'>
            <p>Loop ${i} Gain: ${loops[i].gain.toString()}</p><div id='loop${i}'></div></div>`);
            drawLoopChart(nodeList, nodeNum, `loop${i}`, loops[i]);
        }
        for (let i=loopNum%2; i<nonTouchingLoops.length; i++) {
            if (i%2) {
                bgColor = pathBackGround1;
            }
            else {
                bgColor = loopBackGround1;
            }
            masonsGainPage.nonTouchingLoopGraphs.insertAdjacentHTML('beforeend', `<div style='background-color: ${bgColor}'>
            <p>${nonTouchingLoops[i].length} Loops in Non-Touching Loops Set #${i} Gain: ${nonTouchingLoops[i].gain.toString()}</p>
            <div id='nonTouchingLoop${i}'></div></div>`);
            drawNonTouchingLoopSetChart(nodeList, nodeNum, `nonTouchingLoop${i}`, nonTouchingLoops[i].loops);
        }
    }
    if (pathNum > 0) {
        for (let i=0; i<pathNum; i++) {
            if (i%2) {
                bgColor = pathBackGround1;
            }
            else {
                bgColor = pathBackGround2;
            }
            masonsGainPage.pathGraphs.insertAdjacentHTML('beforeend', `<div style='background-color: ${bgColor}'>
            <p>Forward Path ${i} Gain: ${pathArr[i].gain.toString()}</p><div id='path${i}'></div></div>`);
            drawPathChart(nodeList, nodeNum, `path${i}`, pathArr[i]);
        }
    }
}
//only pass in list of forward paths.
function getMasonsNumerator(loops, paths) {
    let pathsNum = paths.length;
    let loopNum = loops.length;
    let loopsPruned, numerator = nerdamer('0'), detComponet, sumNum;
    for (let pathIndex = 0; pathIndex<pathsNum; pathIndex++) {
        loopsPruned = [];
        for (let loopIndex = 0; loopIndex < loopNum; loopIndex++) {
            if (!loops[loopIndex].isTouchingPath(paths[pathIndex].path)) {
                //only push to loopsPruned if not touching forward path. 
                loopsPruned.push(loops[loopIndex]);
                //do other stuff to calculate numerator.
            }
        }
        paths[pathIndex].determinant = getDeterminant(loopsPruned);
        detComponet = paths[pathIndex].determinant.multiply(paths[pathIndex].gain); 
        numerator = numerator.add(detComponet);
        sumNum = pathIndex+1;
        masonsGainPage.numeratorDesc += `$$G_${sumNum} \\Delta _${sumNum} = ${paths[pathIndex].gain.toString()}\\cdot${paths[pathIndex].determinant.toString()}$$<br>`;
        if (!pathIndex) {//don't want the first one to have a + out front.
            masonsGainPage.numeratorStr += ` ${detComponet.toString()}`;
        }
        else {
            masonsGainPage.numeratorStr += `+ ${detComponet.toString()}`;
        }
    }
    return numerator;
}
/*returns a copy of the object obj.
 If we just assign an object to a variable, the variable gets a reference. 
 Before I used this function, changing the transparency of a term 
 in the topmost plot would also change that of the term in the 'putting it all together' plot*/
function copyObject(obj) {
   return JSON.parse(JSON.stringify(obj));
}
function getSetsOfCombinations(list, setLen) {
    set = [];
    setOfSets = [];
    getSet(list, set, setLen, 0, 0, setOfSets);
    return setOfSets;
}
function getSet(list, set, setTargetLen, setIndex, listIndex, setOfSets) {
    if (setIndex == setTargetLen) {
        setOfSets.push(set);
    }
    else if (listIndex < list.length) {
        let newSet = copyObject(set);
        let newElement = list[listIndex];
        if (setIndex == set.length) {
            newSet.push(newElement);
        }
        else {
            newSet[setIndex] = newElement;
        }
        listIndex++;
        getSet(list, newSet, setTargetLen, setIndex, listIndex, setOfSets);
        //getSet(integers, set, setTargetLen, setIndex, integerIndex);
        setIndex++;
        getSet(list, newSet, setTargetLen, setIndex, listIndex, setOfSets);
    }
}
//use adjacency list of nodes to get array of loops
function getLoops (nodeList) {
    let loops = [];
    for (let i=0; i<nodeList.length; i++) {//iterate through nodes
        for (let j=0; j<nodeList[i].length; j++) {//iterate through list of edges
            if (nodeList[i][j].endNode < i) {//found edge pointing backwards
                loops.push(new Loop(i, nodeList[i][j], nodeList));
            }
        }
    }
    return loops;
}
//calculate determinant using an array of loops.
//assume at least one loop. 
function getDeterminant (loops, makeNonTouchingLoopsList) {
    let determinant = nerdamer('1'), loopNum = loops.length, det, detComponet;
    //gains of individual loops
    let set, sets, label = ``;
    //for (let i=loopNum; i>0; i--) {//5, 4, 3, 2, 1, etc. 
    for (let i=1; i<=loopNum; i++) {//1, 2, 3, 4, 5
        sets = getSetsOfCombinations(loops, i);
        detComponet = nerdamer('0');
        for (let j=0; j<sets.length; j++) {//loop through sets and add to determinant if x sharing.
            set = sets[j];
            det = getNLoopsGain(set, set.length, makeNonTouchingLoopsList);
            determinant = determinant.add(det);
            detComponet = detComponet.add(det);//should we do mult instead?
        }
        if (!detComponet) {//once one componet = 0, all the rest will also = 0.
            break;
        }
        if (makeNonTouchingLoopsList) {
            masonsGainPage.denominatorStr += `+ ${detComponet.toString()}`;
            for (let j=0; j<i; j++) {
                label+=`L<sub>${masonsGainPage.loopLabels[j]}</sub>`;
            }
            masonsGainPage.denominatorDesc += `&sum; ${label}: ${detComponet.toString()}<br>`;
            label = ``;
        }
    }
    return determinant;
}
//get gain contribution for a specific set of non-touching loops.
function getNLoopsGain(loops, loopNum, makeNonTouchingLoopsList) {
    let gainComponet = nerdamer('1');
    let j;
    //try to find if any loops share a node:
    if (loopNum > 1) {
        for (let i=0; i<loopNum; i++) {
            j = i+1;
            while (j < loopNum) {
                if (doLoopsShareANode(loops[i], loops[j])) {
                    return 0;
                }
                j++;//forgot this in a dumb mistake.
            }
            //multipy loop gains together to get gain componet.
            gainComponet = loops[i].gain.multiply(gainComponet);
        }
        if (makeNonTouchingLoopsList) {//find out if is a more efficient way of doing this.
            masonsGainPage.nonTouchingLoops.push(new LoopCollection(loops, gainComponet));
            //if loops don't touch, push them. does this fail to include the sign? should it?
        }
    }
    else {
        gainComponet = loops[0].gain;
    }
    return gainComponet.multiply(Math.pow(-1, loopNum).toString());
}
//returns 1 if they share a node, else returns 0.
//shouldn't be able to share an edge w/o sharing a node.
function doLoopsShareANode (loop1, loop2) {
    for (let i=loop1.to; i<=loop1.from; i++) {
        if (i <= loop2.from && i >= loop2.to) {
            return 1;
        }
    }
    return 0;
}
function uncheckFileSubmit() {//uncheckFileSubmit
    //document.querySelector('#fileSubmit').checked = 0;
    masonsGainPage.fileSubmit.checked = 0;
}
function uncheckTableSubmit() {//uncheckTableSubmit
    //document.querySelector('#tableSubmit').checked = 0;
    masonsGainPage.tableSubmit.checked = 0;
}
function getSample() {
    for (let i=0; i<7; i++) {
        addRow();
    }
    let rows = document.getElementById('table').rows;
    let last = rows.length-1;
    rows[last].children[1].children[0].value = 4;
    rows[last].children[2].children[0].value = 2;
    rows[last].children[3].children[0].value = 5;
    rows[2].children[3].children[0].value = 3;
}

//add empty row to table
function addRow() {
    let html = `<tr>
    <td class='number'>${rowIndex}</td>
    <td><input type='text' class='from' value='${rowIndex}'></input></td>
    <td><input type='text' class='to' value='${rowIndex+1}'></td>
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
    let rows = document.getElementById('table').rows;
    let len = rows.length;
    for (let i=1; i<len; i++) {
        if (parseInt(rows[i].cells[0].innerHTML) == num) {
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
//returns one if node number 'node' is within loop.
function isInLoop(loop, node) {
    if (node >= loop.to && node <= loop.from) {
        return 1;
    }
    return 0;
}
function drawLoopChart(adjacencyList, nodeNum, id, loop) {
    let startX = 5;
    let startY = 40;
    let color = blackHex;//ffcccc
    let diameter = 5;
    let plotXWidth = 300;
    let yLineCorrection = 2.5;
    let xLineCorrection = 2.5;
    let xInterval = parseInt(plotXWidth/nodeNum);//parseInt(plotXWidth/nodeNum)
    let arrowXStartCoord = startX+parseInt(xInterval/2)+4;
    var draw = SVG().addTo('#'+id).size(plotXWidth, 130), last = nodeNum-1;
    let nodes = [], newX, line;
    for (let i=0; i<last; i++) {
        newX = startX+xInterval*i;
        nodes.push([newX+2, startY]);//nodes[0] has x & y coordinates for node 0.
        if (isInLoop(loop, i) && isInLoop(loop, i+1)) {//both this node & next node are in the loop.
            draw.circle(diameter).fill(pinkHex).move(newX, startY);
            arrow(draw, pinkHex, arrowXStartCoord+xInterval*i, startY+yLineCorrection);
            color = pinkHex;
        }
        else if (isInLoop(loop, i)) {//last node in loop.
            draw.circle(diameter).fill(pinkHex).move(newX, startY);
            arrow(draw, color, arrowXStartCoord+xInterval*i, startY+yLineCorrection);
            color = blackHex;
        }
        else {
            draw.circle(diameter).fill(color).move(newX, startY);
            arrow(draw, color, arrowXStartCoord+xInterval*i, startY+yLineCorrection);
            color = blackHex;
        }
        line = draw.line(nodes[i][0], startY+yLineCorrection, startX+xInterval*(i+1)+2, startY+yLineCorrection);
        line.stroke({ color: color, width: 1, linecap: 'round' });
        color = blackHex;
    }
    color = blackHex;
    newX = startX+xInterval*last;
    nodes.push([newX+2, startY]);//[x, y] coordinates.
    draw.circle(diameter).fill(color).move(newX, startY);//last node won't have an arrow
    /*line = draw.line(startX+xLineCorrection, startY+yLineCorrection, startX+xInterval*last+xLineCorrection, startY+yLineCorrection);
    line.stroke({ color: color, width: 1, linecap: 'round' });*/
    let endNode, edgeListLen, middleX;
    //for each edge between non-consecutive loops, draw a path above or below the main line.
    for (let node = 0; node<adjacencyList.length; node++) {
        edgeListLen = adjacencyList[node].length;
        if (edgeListLen > 1) {
            for (let adjItemIndex = 1; adjItemIndex < edgeListLen; adjItemIndex++) {
                endNode = adjacencyList[node][adjItemIndex].endNode;
                middleX = nodes[node][0]+(nodes[endNode][0]-nodes[node][0])/2;
                if (node < endNode) {//path, points forward.
                    drawPath(draw, nodes[node], nodes[endNode], color, 20, 1);
                    arrow(draw, color, middleX, startY-15);
                }
                else {//points backwards, is a loop.
                    if (node == loop.from && endNode == loop.to) {
                        color = pinkHex;
                    }
                    drawPath(draw, nodes[node], nodes[endNode], color);
                    arrow(draw, color, middleX, startY+15, 0);
                }
                color = blackHex;//set back to black by default.
            }    
        }
    }
}
function drawNonTouchingLoopSetChart(adjacencyList, nodeNum, id, loopSet) {
    let startX = 5;
    let startY = 40;
    let color = blackHex;//ffcccc
    let diameter = 5;
    let plotXWidth = 300;
    let yLineCorrection = 2.5;
    let xLineCorrection = 2.5;
    let xInterval = parseInt(plotXWidth/nodeNum);//parseInt(plotXWidth/nodeNum)
    let arrowXStartCoord = startX+parseInt(xInterval/2)+4;
    var draw = SVG().addTo('#'+id).size(plotXWidth, 130), last = nodeNum-1;
    let nodes = [], newX, line, loopIndex = 0;
    loopSet = mergeSortNonTouchingLoopSet(loopSet);//sort in ascending order w/ merge sort
    //loopSet sorted in ascending .to order. 
    for (let i=0; i<last; i++) {
        newX = startX+xInterval*i;
        nodes.push([newX+2, startY]);//nodes[0] has x & y coordinates for node 0.
        loop = loopSet[loopIndex];
        if (loop) {
            if (isInLoop(loop, i) && isInLoop(loop, i+1)) {//both this node & next node are in the loop.
                draw.circle(diameter).fill(pinkHex).move(newX, startY);
                arrow(draw, pinkHex, arrowXStartCoord+xInterval*i, startY+yLineCorrection);
                color = pinkHex;
            }
            else if (loop.from == i) {//isInLoop(loop, i)) {//last node in loop.
                draw.circle(diameter).fill(pinkHex).move(newX, startY);
                arrow(draw, color, arrowXStartCoord+xInterval*i, startY+yLineCorrection);
                loopIndex++;//after finish last node last node in loop, switch to another loop. 
                color = blackHex;
            }
            else {//node was in none of loops. 
                draw.circle(diameter).fill(color).move(newX, startY);
                arrow(draw, color, arrowXStartCoord+xInterval*i, startY+yLineCorrection);
                color = blackHex;
            } 
        }
        else {//node was in none of loops. 
            draw.circle(diameter).fill(color).move(newX, startY);
            arrow(draw, color, arrowXStartCoord+xInterval*i, startY+yLineCorrection);
            color = blackHex;
        }
        /*draw.circle(diameter).fill(color).move(newX, startY);
        arrow(draw, color, arrowXStartCoord+xInterval*i, startY+yLineCorrection);*/
        line = draw.line(nodes[i][0], startY+yLineCorrection, startX+xInterval*(i+1)+2, startY+yLineCorrection);
        line.stroke({ color: color, width: 1, linecap: 'round' });
        color = blackHex;
    }//too many color = blackHex; statements?
    color = blackHex;
    newX = startX+xInterval*last;
    nodes.push([newX+2, startY]);//[x, y] coordinates.
    draw.circle(diameter).fill(color).move(newX, startY);//last node won't have an arrow
    /*line = draw.line(startX+xLineCorrection, startY+yLineCorrection, startX+xInterval*last+xLineCorrection, startY+yLineCorrection);
    line.stroke({ color: color, width: 1, linecap: 'round' });*/
    let endNode, edgeListLen, middleX;
    //for each edge between non-consecutive loops, draw a path above or below the main line.
    loopIndex = 0;
    loop = loopSet[loopIndex];
    for (let node = 0; node<adjacencyList.length; node++) {
        edgeListLen = adjacencyList[node].length;
        if (edgeListLen > 1) {
            for (let adjItemIndex = 1; adjItemIndex < edgeListLen; adjItemIndex++) {
                endNode = adjacencyList[node][adjItemIndex].endNode;
                middleX = nodes[node][0]+(nodes[endNode][0]-nodes[node][0])/2;
                if (node < endNode) {//points forwards, is forward path edge
                    drawPath(draw, nodes[node], nodes[endNode], color, 20, 1);
                    arrow(draw, color, middleX, startY-15);
                }
                else {//points backwards, is a loop.
                    if (loop) {
                        if (node == loop.from && endNode == loop.to) {
                            color = pinkHex;
                            loopIndex++;
                            loop = loopSet[loopIndex];
                        }
                    }
                    drawPath(draw, nodes[node], nodes[endNode], color);
                    arrow(draw, color, middleX, startY+15, 0);
                }
                color = blackHex;//set back to black by default.
            }    
        }
    }
}
function drawPathChart(adjacencyList, nodeNum, id, pathObj) {
    let path = pathObj.path;
    let pathNodeIndex = 0;
    let startX = 5;
    let startY = 40;
    let color = blackHex;//ffcccc
    let diameter = 5;
    let plotXWidth = 300;
    let yLineCorrection = 2.5;
    let xLineCorrection = 2.5;
    let xInterval = parseInt(plotXWidth/nodeNum);//parseInt(plotXWidth/nodeNum)
    let arrowXStartCoord = startX+parseInt(xInterval/2)+4;
    var draw = SVG().addTo('#'+id).size(plotXWidth, 130), last = nodeNum-1;
    let nodes = [], newX, line;
    for (let i=0; i<last; i++) {
        newX = startX+xInterval*i;
        nodes.push([newX+2, startY]);//nodes[0] has x & y coordinates for node 0.
        if (i == path[pathNodeIndex]) {
            draw.circle(diameter).fill(pinkHex).move(newX, startY);
            if (i+1 == path[pathNodeIndex+1]) {
                arrow(draw, pinkHex, arrowXStartCoord+xInterval*i, startY+yLineCorrection);
                color = pinkHex;                
            }
            else {
                arrow(draw, blackHex, arrowXStartCoord+xInterval*i, startY+yLineCorrection);
            }
            pathNodeIndex++;
        }
        else {
            draw.circle(diameter).fill(blackHex).move(newX, startY);
            arrow(draw, blackHex, arrowXStartCoord+xInterval*i, startY+yLineCorrection);
            color = blackHex;
        }
        line = draw.line(nodes[i][0], startY+yLineCorrection, startX+xInterval*(i+1)+2, startY+yLineCorrection);
        line.stroke({ color: color, width: 1, linecap: 'round' });
        color = blackHex;
    }
    newX = startX+xInterval*last;
    nodes.push([newX+2, startY]);//[x, y] coordinates.
    draw.circle(diameter).fill(pinkHex).move(newX, startY);//last node won't have an arrow
    /*var line = draw.line(startX+xLineCorrection, startY+yLineCorrection, startX+xInterval*last+xLineCorrection, startY+yLineCorrection);//.move(20, 20);
    line.stroke({ color: color, width: 1, linecap: 'round' });*/
    let endNode, edgeListLen, middleX, firstNodeIndex, secondNodeIndex;
    //for each edge between non-consecutive loops, draw a path above or below the main line.
    for (let node = 0; node<adjacencyList.length; node++) {
        edgeListLen = adjacencyList[node].length;
        if (edgeListLen > 1) {
            for (let adjItemIndex = 1; adjItemIndex < edgeListLen; adjItemIndex++) {
                endNode = adjacencyList[node][adjItemIndex].endNode;
                middleX = nodes[node][0]+(nodes[endNode][0]-nodes[node][0])/2;
                if (node < endNode) {//path is a forward path.
                    firstNodeIndex = path.indexOf(node);
                    secondNodeIndex = path.indexOf(endNode);
                    //path is our forward path
                    if (firstNodeIndex > -1 && secondNodeIndex > -1 && firstNodeIndex+1 == secondNodeIndex) {
                        color = pinkHex;
                    }
                    drawPath(draw, nodes[node], nodes[endNode], color, 20, 1);
                    arrow(draw, color, middleX, startY-15);
                }
                else {//points backwards, is a loop.
                    drawPath(draw, nodes[node], nodes[endNode], color);
                    arrow(draw, color, middleX, startY+15, 0);
                }
                color = blackHex;//set back to black by default.
            }    
        }
    }
}
//merge sort, but for a set of non-touching loops.
function mergeSortNonTouchingLoopSet(loopSet) {
    let temp;
    if (loopSet.length == 2) {
        if (loopSet[0].to > loopSet[1].to) {
            temp = copyObject(loopSet[0]);
            loopSet[0] = copyObject(loopSet[1]);
            loopSet[1] = temp;
            return loopSet;//sort two elements.
        }
        else {
            return loopSet;//already sorted;
        }
    }
    if (loopSet.length < 2) {
        return loopSet;
    }
    let mid = parseInt(loopSet.length/2);
    let leftHalf = loopSet.slice(0, mid);
    let rightHalf = loopSet.slice(mid);
    return mergeNonTouchingLoopSets(mergeSortNonTouchingLoopSet(leftHalf), mergeSortNonTouchingLoopSet(rightHalf));
}
//merge sorted sets of non-touching loops into larger ones.
function mergeNonTouchingLoopSets(loopSet1, loopSet2) {
    let loopSet3 = [];
    let set1Index = 0;
    let set2Index = 0;
    let set1Len = loopSet1.length;
    let set2Len = loopSet2.length;
    while(set1Index < set1Len && set2Index < set2Len) {
        if (loopSet1[set1Index].to < loopSet2[set2Index].to) {
            loopSet3.push(loopSet1[set1Index]);
            set1Index++;
        }
        else {
            loopSet3.push(loopSet2[set2Index]);
            set2Index++;
        }
    }
    if (set1Len > set2Len) {
        for (; set1Index<set1Len; set1Index++) {
            loopSet3.push(loopSet1[set1Index]);
        }
    }
    else if (set2Len > set1Len) {
        for (; set2Index<set2Len; set2Index++) {
            loopSet3.push(loopSet2[set2Index]);
        }
    }
    return loopSet3;
}
function drawFullChart(adjacencyList, nodeNum, id) {
    let startX = 5;
    let startY = 40;
    let color = blackHex;//ffcccc
    let diameter = 5;
    let plotXWidth = 300;
    let yLineCorrection = 2.5;
    let xLineCorrection = 2.5;
    let xInterval = parseInt(plotXWidth/nodeNum);//parseInt(plotXWidth/nodeNum)
    let arrowXStartCoord = startX+parseInt(xInterval/2)+4;
    var draw = SVG().addTo('#'+id).size(plotXWidth, 130), last = nodeNum-1;
    let nodes = [], newX;
    for (let i=0; i<last; i++) {
        newX = startX+xInterval*i;
        nodes.push([newX+2, startY]);//nodes[0] has x & y coordinates for node 0.
        draw.circle(diameter).fill(color).move(newX, startY);
        arrow(draw, color, arrowXStartCoord+xInterval*i, startY+yLineCorrection);
    }
    newX = startX+xInterval*last;
    nodes.push([newX+2, startY]);//[x, y] coordinates.
    draw.circle(diameter).fill(color).move(newX, startY);//last node won't have an arrow
    var line = draw.line(startX+xLineCorrection, startY+yLineCorrection, startX+xInterval*last+xLineCorrection, startY+yLineCorrection);//.move(20, 20);
    line.stroke({ color: color, width: 1, linecap: 'round' });
    let endNode, edgeListLen, middleX;
    //for each edge between non-consecutive loops, draw a path above or below the main line.
    for (let node = 0; node<adjacencyList.length; node++) {
        edgeListLen = adjacencyList[node].length;
        if (edgeListLen > 1) {
            for (let adjItemIndex = 1; adjItemIndex < edgeListLen; adjItemIndex++) {
                endNode = adjacencyList[node][adjItemIndex].endNode;
                middleX = nodes[node][0]+(nodes[endNode][0]-nodes[node][0])/2;
                if (node < endNode) {//arrow(plot, color = '#000', xCoord, yCoord, pointsRightward = 1)
                    /*drawPath(draw, nodes[node], nodes[endNode], color);
                    arrow(draw, color, middleX, startY+15);*/
                    drawPath(draw, nodes[node], nodes[endNode], color, 20, 1);
                    arrow(draw, color, middleX, startY-15);
                }
                else {//points backwards, is a loop.
                    /*drawPath(draw, nodes[endNode], nodes[node], color, 20, 1);
                    arrow(draw, color, middleX, startY-15, 0);*/
                    drawPath(draw, nodes[node], nodes[endNode], color);
                    arrow(draw, color, middleX, startY+15, 0);
                }
            }    
        }
    }
}
function drawPath(draw, startPoint, stopPoint, color, slopeMag, isOverLine) {
    let pathInput = getPath(startPoint, stopPoint, slopeMag, isOverLine);
    let path = draw.path(pathInput);
    path.fill('none');//.move(20, 20);
    path.stroke({ color: color, width: 1, linecap: 'round', linejoin: 'round' });
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
function arrow(plot, color = '#000', xCoord, yCoord, pointsRightward = 1) {
    if (pointsRightward) {//arrow points rightward as default
        let top = plot.line(xCoord-5, yCoord-5, xCoord, yCoord);
        top.stroke({ color: color, width: 1, linecap: 'round' });
        bottom = plot.line(xCoord-5, yCoord+5, xCoord, yCoord);
        bottom.stroke({ color: color, width: 1, linecap: 'round' });
    }
    else {//arrow points leftward
        xCoord -= 5;
        let top = plot.line(xCoord, yCoord, xCoord+5, yCoord-5);
        top.stroke({ color: color, width: 1, linecap: 'round' });
        bottom = plot.line(xCoord, yCoord, xCoord+5, yCoord+5);
        bottom.stroke({ color: color, width: 1, linecap: 'round' });
    }
}