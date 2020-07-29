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
    isTouchingPath(path) {
        if (path.indexOf(this.from) > -1 || path.indexOf(this.to)) {
            return 1;
        }
        /* in case it isn't just endpoints that count as 'touching':
        for (let i=this.to; i<(this.from+1); i++) {
            if (path.indexOf(i) > -1) {
                return 1;
            }
        }*/
        return 0;
    }
};

let table, rowIndex = 0, nodeList = [], nodeGraph = [], masonsGainPage;
function onBodyLoad() {
    /*let draw = SVG().addTo('body').size(300, 300);
    let rect = draw.rect(100, 100).attr({fill: '#f06'})*/
    table = document.getElementById('table');
    masonsGainPage = new Page();//might add table to page
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
                gain *= adjItem[i].gain;
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
    let i=1;
    if (rows[i]) {//first one.
        from = parseInt(rows[i].children[1].children[0].value);
        to = parseInt(rows[i].children[2].children[0].value);
        gain = parseInt(rows[i].children[3].children[0].value);
        //data.push({from: from.toString(), to:to.toString()});
    }
    while (to == from + 1 && rows[i]) {//while from's are consecutive, add nodes to the graph
        nodeList.push([new Edge(to, gain)]);//each index i of nodelist represents a node #.
        i++;
        if (rows[i]) {
            from = parseInt(rows[i].children[1].children[0].value);
            to = parseInt(rows[i].children[2].children[0].value);
            gain = parseInt(rows[i].children[3].children[0].value);
        }
    }
    let forwardNodeList = copyObject(nodeList);
    let lastNodeIndex = nodeList[nodeList.length-1][0].endNode;
    //let nodeNum = data.length;
    for (; i<rowNum; i++) {//get the rest.
        from = parseInt(rows[i].children[1].children[0].value);//find('from').val();
        to = parseInt(rows[i].children[2].children[0].value);//find('to').val();
        gain = parseInt(rows[i].children[3].children[0].value);
        nodeList[from].push(new Edge(to, gain));
        if (to > from) {//edge is forward, add to forwardNodeList
            forwardNodeList[from].push(new Edge(to, gain));//faster to copy or make your own?
        }//copyObject(nodeList[from][nodeList[from].length-1])
        //data.push({from: from.toString(), to:to.toString()});
    }
    return [nodeList, forwardNodeList, lastNodeIndex];
}
//uses a recursive function getForwardPath() to get the array of forward paths.
// forwardAdjacencyList is list of edges pruned of backward edges (loops). 
function getForwardPaths(forwardAdjacencyList, lastNodeIndex) {
    let pathArr = [];
    getForwardPath(0, [], 1, forwardAdjacencyList, pathArr, lastNodeIndex);
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
        getForwardPath(edge.endNode, copyObject(path), gain*edge.gain, adjacencyList, pathArr, lastNodeIndex);
    }
}
function getNodesFromFile() {
    let rows = masonsGainPage.inputTarget.value.split('\n');
    let rowNum = rows.length;
    let from, to, gain, nodeList = [];
    if (rows[rowNum-1].length == '' || rows[rowNum-1].length == ' ') {//take care of extra enter sign if it exists. 
        rows.pop();
        rowNum = rows.length;
    }
    for (let i=0; i<rowNum; i++) {
        rows[i] = rows[i].split(' ').map(n => parseInt(n));//replace string with list of numbers.
    }
    let i=0;
    if (rows[i]) {//first one.
        from = rows[i][1];
        to = rows[i][2];
        gain = rows[i][2];
        //data.push({from: from.toString(), to:to.toString()});
    }
    while (to == from + 1 && rows[i]) {//while from's are consecutive, add nodes to the graph
        nodeList.push([new Edge(to, gain)]);//each index i of nodelist represents a node #.
        i++;
        if (rows[i]) {
            from = rows[i][1];
            to = rows[i][2];
            gain = rows[i][3];
        }
    }
    let forwardNodeList = copyObject(nodeList);
    let lastNodeIndex = nodeList[nodeList.length-1][0].endNode;
    //let nodeNum = data.length;
    for (; i<rowNum; i++) {//get the edges connecting nonconsecutive nodes.
        from = rows[i][1];
        to = rows[i][2];
        gain = rows[i][3];
        nodeList[from].push(new Edge(to, gain));
        if (to > from) {//edge is forward, add to forwardNodeList
            forwardNodeList[from].push(new Edge(to, gain));//faster to copy or make your own?
        }//copyObject(nodeList[from][nodeList[from].length-1])
    }
    return [nodeList, forwardNodeList, lastNodeIndex];
}
function onSubmit() {
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
    //let loopList = getSetsOfCombinations(['a', 'b', 'c', 'd', 'e'], 3);
    masonsGainPage.loops = loops;
    masonsGainPage.determinant = getDeterminant(loops);
    masonsGainPage.forwardPaths = getForwardPaths(forwardNodeList, lastNodeIndex);
    let nodeNum = nodeList.length+1;
    drawChart(nodeNum, 'signalFlowGraph');
}
//only pass in list of forward paths.
function getMasonsNumerator(loops, paths) {
    let pathsNum = paths.length;
    let loopNum = loops.length;
    let loopsPruned;
    for (let pathIndex = 0; pathIndex<pathsNum; pathIndex++) {
        loopsPruned = [];
        for (let loopIndex = 0; loopIndex < loopNum; loopIndex++) {
            if (!loopsPrunded[loopIndex].isTouchingPath(paths[pathIndex].path)) {
                loopsPruned.push(loops[loopIndex]);
                //do other stuff to calculate numerator.
            }
        }
    }
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
function getDeterminant (loops) {
    let determinant = 1, loopNum = loops.length;
    //gains of individual loops
    /*for (let i=0; i<loopNum; i++) { 
        ret -= loops[i].gain;
    }
    if (loopNum > 1) {
        let j;
        for (let i=0; i<loopNum; i++) {
            j = i;
            while (j < loopNum) {
                if (doLoopsShareANode(loops[i], loops[j])) {
                    ret += loops[i].gain*loops[j].gain;
                }
            }
        }
    }*/
    let set, sets;
    for (let i=loopNum; i>0; i--) {//5, 4, 3, 2, 1, etc. 
        sets = getSetsOfCombinations(loops, i);
        for (let j=0; j<sets.length; j++) {//loop through sets and add to determinant if x sharing.
            set = sets[j];
            determinant += getNLoopsGain(set, set.length);
        }
    }
    return determinant;
}
//get gain contribution for a specific set of non-touching loops.
function getNLoopsGain(loops, loopNum) {
    let gainComponet = 1;
    let j;
    //try to find if any loops share a node:
    if (loopNum > 1) {
        for (let i=0; i<loopNum; i++) {
            j = i+1;
            while (j < loopNum) {
                if (doLoopsShareANode(loops[i], loops[j])) {
                    return 0;
                }
                /*else {
                    gainComponet += loops[i].gain*loops[j].gain;
                }*/
                j++;//forgot this in a dumb mistake.
            }
            //multipy loop gains together to get gain componet.
            gainComponet *= loops[i].gain;
        }    
    }
    else {
        gainComponet = loops[0].gain;
    }
    return gainComponet*Math.pow(-1, loopNum);
}
//returns 1 if they share a node, else returns 0.
function doLoopsShareANode (loop1, loop2) {
    let loop1Nodes = [loop1.to, loop1.from];
    let loop2Nodes = [loop2.to, loop2.from];
    //if (loop1Nodes.indexOf(loop2Nodes[0]) > -1 || loop1Nodes.indexOf(loop2Nodes[1] > -1)) {
    if (loop1Nodes.indexOf(loop2Nodes[0]) > -1 || loop1Nodes.indexOf(loop2Nodes[1]) > -1) {
        return 1;
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