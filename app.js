/* only will use one instance, which will be global.
we will use it to keep track of dom elements and store values that we want to access in the console
after the code has run. */
class Page {
    constructor() {
        this.fileSubmit = document.querySelector('#fileSubmit');
        this.tableSubmit = document.querySelector('#tableSubmit');
        this.inputTarget = document.querySelector('#content-target');
        this.loopGraphs = document.getElementById('loopGraphs');
        this.nonTouchingLoopGraphs = document.getElementById('nonTouchingLoopGraphs');
        this.pathGraphs = document.getElementById('forwardPathGraphs');
        this.pathDesc = document.getElementById('totalGraphDesc');
        this.signalFlowGraph = document.getElementById('signalFlowGraph');
        this.determinantDesc = document.getElementById('determinantStr');
        this.numeratorHTML = document.getElementById('numeratorStr');
        this.table = document.getElementById('table');
    }
}
//Edge objects will be stored in an adjacency list nodeList describing the signal flow graph.
//an item nodeList[i] will be a list of the edges starting at i.
class Edge {
    constructor(endNode, gain) {
        this.endNode = endNode;//graph node where edge ends.
        this.gain = gain;//edge's gain
    }
};
/* store loop with the # of the highest-numbered node as from & the
# of the lowest-numbered node as to. */
class Loop {//new Loop(i, nodeList[i][j], nodeList)
    constructor (from, to, gain, path) {
        this.from = from;
        this.to = to;
        this.gain = gain;
        this.path = path;
    }//get rid of getLoopGain()
    isTouchingPath(path) {//takes array of nodes in path, returns true if the path touches the loop.
        for (let i=this.to; i<=this.from; i++) {
            if (path.indexOf(i) > -1) {
                return 1;
            }
        }
        return 0;
    }
};
//collection of loops (for our purposes they will be non-touching.)
class LoopCollection {
    constructor (loops, gain) {
        this.loops = loops;
        this.gain = gain;
        this.length = loops.length;
    }
}
//should probably stop nodeList from being a global variable. 
let table, rowIndex = 0, nodeGraph = [], masonsGainPage;
let blackHex = '#000', pinkHex = '#e75480 ';//'#ffc0cb';
//called when html body loads. 
function onBodyLoad() {
    masonsGainPage = new Page();
    document.getElementById('fileInput').addEventListener('change', fileHandler);
}
//this function handles loading a file from a user's computer & displaying it in an element
//stored in masonsGainPage.inputTarget. 
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

//return the gain of a loop from node # 'from' to node # 'to'
function getLoopGain(toNode, from, adjacencyList) {
    let adjItem = adjacencyList[from], adjItemLen = adjacencyList[from].length, 
    gain = toNode.gain, to = toNode.endNode;
    let adjLen = adjacencyList.length, currentNode = to;
    //loop through adjacency list starting at 'to', 
    //find gain of all edges between 'to' and 'from' besides the one that points backwards
    //from 'from' to 'to'. 
    //by default, 'gain' is set to gain of that backwards edge. 
    /* could we just use index 0 for this loop?*/
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
//gets list of edges from a table & assigns them to an adjacency list.
//creates seperate adjacency list of only the edges with a forward direction.
function getEdgesFromTable() {
    let rows = masonsGainPage.table.rows;
    let rowNum = rows.length, from, to, gain,
    nodeList = [], nodeNum;//reset nodeList to nothing. 
    let i=1, fileStr;//row #0 has the table titles, which we don't want.
    if (rows[i]) {//first one.
        from = parseInt(rows[i].children[1].children[0].value);
        to = parseInt(rows[i].children[2].children[0].value);
        gain = nerdamer(rows[i].children[3].children[0].value);
        fileStr = `0 ${from} ${to} ${gain.toString()}`;
    }
    //while from's are consecutive, add edges to the graph
    while (to == from + 1 && rows[i]) {
        nodeList.push([new Edge(to, gain)]);//each index i of nodelist represents a node #.
        i++;
        if (rows[i]) {
            from = parseInt(rows[i].children[1].children[0].value);
            to = parseInt(rows[i].children[2].children[0].value);
            gain = nerdamer(rows[i].children[3].children[0].value);
            fileStr += `${'\n'}${i-1} ${from} ${to} ${gain.toString()}`;
        }
    }
    masonsGainPage.sinkNode = nodeList[nodeList.length-1][0].endNode;
    let forwardNodeList = copyObjectJQuery(nodeList);
    let lastNodeIndex = nodeList[nodeList.length-1][0].endNode;
    while (i<rowNum) {//get the edges between non-consecutive nodes..
        if (nodeList[from]) {
            nodeList[from].push(new Edge(to, gain));
        }
        else {//otherwise, must be from last node.
            nodeList.push([new Edge(to, gain)]);
            nodeNum = nodeList.length;
        }
        if (to > from) {//if edge is pointing forward/rightward, add to forwardNodeList
            forwardNodeList[from].push(new Edge(to, gain));
        }
        i++;
        if (rows[i]) {
            from = parseInt(rows[i].children[1].children[0].value);
            to = parseInt(rows[i].children[2].children[0].value);
            gain = nerdamer(rows[i].children[3].children[0].value);
            fileStr += `${'\n'}${i-1} ${from} ${to} ${gain.toString()}`;
        }
    }
    if (!nodeNum) {
        nodeNum = nodeList.length+1;
    }
    masonsGainPage.fileStr = fileStr;
    return [nodeList, forwardNodeList, lastNodeIndex, nodeNum];
}
//uses a recursive function getForwardPath() to get the array of forward paths.
//forwardAdjacencyList is an adjacency list of the edges pointing forwards/rightwards.
function getForwardPaths(forwardAdjacencyList, lastNodeIndex) {
    let pathArr = [];
    getForwardPath(0, [], nerdamer('1'), forwardAdjacencyList, pathArr, lastNodeIndex);
    return pathArr;
}
//use this recursive function on edge adjacencyList without loops to find forward paths.
//gain function keeps track of the path's gain; for each new index we add to a path we multiply
//the gain of the edge between that new index and the last one by the current 'gain' value.
function getForwardPath(index, path, gain, adjacencyList, pathArr, lastNodeIndex) {
    path.push(index);//add current index in adjacencyList to forward path
    if (index == lastNodeIndex) {//base case, we got to the end of the node.
        //path & its gain are added to an array of paths. determinant will be calculated later. 
        pathArr.push({path: path, gain: gain, len: path.length, determinant: 0});
        return;
    }
    //call function for every edge connected to node # 'index' in adjacencyList.
    //pass a copy of the path so pathArr will eventually have every path. 
    let edge, forwardEdges = adjacencyList[index];
    let forwardEdgesNum = forwardEdges.length;
    for (let i=0; i<forwardEdgesNum; i++) {
        edge = forwardEdges[i];
        getForwardPath(edge.endNode, copy1DArr(path), gain.multiply(edge.gain), adjacencyList, pathArr, lastNodeIndex);
    }
}
//add loops between to & from in adjacencyList to loopList.
//adjacencyList doesn't have loops.
function addLoops(to, from, backwardGain, adjacencyList, loopList) {
    let pathArr = [], pathArrLen;
    getForwardPath(to, [], nerdamer('1'), adjacencyList, pathArr, from);
    pathArrLen = pathArr.length;
    for (let i=0; i<pathArrLen; i++) {
        loopList.push(new Loop(from, to, pathArr[i].gain.multiply(backwardGain), pathArr[i].path));
    }
}
//gets edges from file & stores them in an adjacency list. stores gains as nerdamer objects for symbolic arithmetic.
function getEdgesFromFile() {
    masonsGainPage.fileStr = masonsGainPage.inputTarget.value;
    //fileStr: string of file content given by user. 
    let rows = masonsGainPage.inputTarget.value.split('\n');
    let rowNum = rows.length;
    let from, to, gain, nodeList = [], nodeNum;
    //if there is an empty space at the end of the file, remove it from rows.
    if (rows[rowNum-1].length == '' || rows[rowNum-1].length == ' ') { 
        rows.pop();
        rowNum = rows.length;
    }
    for (let i=0; i<rowNum; i++) {
        rows[i] = rows[i].split(' ');//numbers are separated by a space. 
    }
    let i=0;
    //while numbers in 'from' category are apart by 1, add nodes to the graph
    if (rows[i]) {
        from = parseInt(rows[i][1]);
        to = parseInt(rows[i][2]);
        gain = nerdamer(rows[i][3]);
    }
    while (to == from + 1 && rows[i]) {
        nodeList.push([new Edge(to, gain)]);//each index i of nodelist represents a node #.
        i++;
        if (rows[i]) {
            from = parseInt(rows[i][1]);
            to = parseInt(rows[i][2]);
            gain = nerdamer(rows[i][3]);
        }
    }
    masonsGainPage.sinkNode = nodeList[nodeList.length-1][0].endNode;
    let forwardNodeList = copyObjectJQuery(nodeList);
    let lastNodeIndex = nodeList[nodeList.length-1][0].endNode;
    //get the edges nonconsecutive nodes not right next to each other.
    for (; i<rowNum; i++) {
        from = parseInt(rows[i][1]);
        to = parseInt(rows[i][2]);
        gain = nerdamer(rows[i][3]);
        if (nodeList[from]) {
            nodeList[from].push(new Edge(to, gain));
        }
        else {//otherwise, must be from last node.
            nodeList.push([new Edge(to, gain)]);
            nodeNum = nodeList.length;
        }
        if (to > from) {//if edge points forward/rightward, add to forwardNodeList
            forwardNodeList[from].push(new Edge(to, gain));
        }
    }
    if (!nodeNum) {
        nodeNum = nodeList.length+1;
    }
    return [nodeList, forwardNodeList, lastNodeIndex, nodeNum];
}
//saves a .txt file with string 'contentStr' to user's computer 
function saveFile(contentStr) {
    var blob = new Blob([contentStr], {type: "text/plain;charset=utf-8"});
    saveAs(blob, "graphEdges.txt");
}
//when a user clicks 'Submit', this function checks if the variable
//for the file string exists, and if so calls a function to download a .txt file
//with that string as its content. 
function downloadEdgeFile() {
    if (masonsGainPage.fileStr) {
        saveFile(masonsGainPage.fileStr);       
    }
    else {
        saveFile('');
    }
}
//called when user clicks 'Submit'. serves as a 'main' function for the calculation of the 
//Mason's Gain Formula and its associated plots. 
function onSubmit() {
    let nodeList, forwardNodeList, lastNodeIndex, nodeNum;
    //if the user checked a button for the file, get the adjacency list from the file.
    //otherwise, get it form the table.
    //one box is checked by default & users cannot leave no boxes unchecked.
    if (masonsGainPage.fileSubmit.checked) {
        [nodeList, forwardNodeList, lastNodeIndex, nodeNum] = getEdgesFromFile();
    }
    else {
        [nodeList, forwardNodeList, lastNodeIndex, nodeNum] = getEdgesFromTable();
    }
    let loops = getLoops(nodeList, forwardNodeList);//get an array of the loops. 
    let pathArr = getForwardPaths(forwardNodeList, lastNodeIndex);//get an array of the forward paths. 
    masonsGainPage.loops = loops;
    masonsGainPage.nonTouchingLoops = [];//array of sets of non-touching loops.
    let nonTouchingLoops = masonsGainPage.nonTouchingLoops;
    masonsGainPage.numeratorStr = `$$\\sum_{k=1}^N  {G_k \\Delta _k} = `;
    masonsGainPage.numeratorDesc = ``;
    masonsGainPage.denominatorDesc = ``;
    masonsGainPage.denominatorStr = `$$\\Delta = 1 `;
    //subscripts for loops in determinant formula: 
    masonsGainPage.loopLabels = 'ijklmnopqrstuvwxyzabcdefghIGKLMNOPQRSTUVWXYZABCDEF';
    //get determinant in denominator, delta symbol
    masonsGainPage.determinant = getDeterminant(loops, 1);
    masonsGainPage.forwardPaths = pathArr;
    //arrange so only loop through this once.
    //calculate numerator solution in formula. numeratorStr contains a string of the sum of the componets. 
    masonsGainPage.numerator = getMasonsNumerator(loops, masonsGainPage.forwardPaths);
    if (masonsGainPage.numeratorStr.indexOf('+') > -1) {//more than 1 element.
        masonsGainPage.numeratorStr += ` = ${masonsGainPage.numerator.toString()}$$`;
    }
    else {
        masonsGainPage.numeratorStr += `$$`;
    }
    //string of denominator sum
    masonsGainPage.denominatorStr += ` = ${masonsGainPage.determinant.toString()}$$`;
    //final answer to formula: 
    if (masonsGainPage.determinant.toString() == "0") {
        alert("Determinant is 0; cannot divide by 0.");
        downloadEdgeFile();
        location.reload();
    }
    masonsGainPage.finalGain = masonsGainPage.numerator.divide(masonsGainPage.determinant);
    
    //rest of onSubmit() draws graphs & updates html. 
    //erase graphs from last time.
    masonsGainPage.loopGraphs.innerHTML = '';
    masonsGainPage.nonTouchingLoopGraphs.innerHTML = '';
    masonsGainPage.pathGraphs.innerHTML = '';
    masonsGainPage.signalFlowGraph.innerHTML = '';

    //signal flow graph without any pink to emphasize one path or loop
    drawFullChart(nodeList, nodeNum, 'signalFlowGraph');
    //change to show numerator & denominator 
    masonsGainPage.pathDesc.innerHTML = `$$Total Signal Flow Graph Gain: \\frac{${masonsGainPage.numerator.toString()}}{${masonsGainPage.determinant.toString()}}$$`;
    masonsGainPage.signalFlowGraph.scrollIntoView();
    let loopNum = loops.length;
    let pathNum = pathArr.length, bgColor;
    let loopBackGround1 = '#e8f4f8';
    let pathBackGround1 = '#FFE6EE';
    let pathBackGround2 = '#FAEBD7';
    let yCaption = `<div class="halfWidthEach"><div class="math"><div class="left">$$y_\\text{in}:$$</div></div><div></div></div><br>`;
    masonsGainPage.determinantDesc.innerHTML = yCaption+masonsGainPage.denominatorDesc+masonsGainPage.denominatorStr;
    masonsGainPage.numeratorHTML.innerHTML = `$$y_\\text{out}:$$` + masonsGainPage.numeratorDesc+masonsGainPage.numeratorStr;
    MathJax.typeset();//MathJax renders new TeX inputted by html.
    if (loopNum > 0) {
        //draw chart & show descriptions for each loop
        for (let i=0; i<loopNum; i++) {
            if (i%2) {
                bgColor = pathBackGround1;
            }
            else {
                bgColor = loopBackGround1;
            }
            //insert a discription for a loop.
            masonsGainPage.loopGraphs.insertAdjacentHTML('beforeend', `<div style='background-color: ${bgColor}'>
            <p>Loop ${i} Gain: ${loops[i].gain.toString()}</p><div id='loop${i}'></div></div>`);
            drawLoopChart(nodeList, nodeNum, `loop${i}`, loops[i]);
        }
        //draw chart & show descriptions for each collection of non-touching loops.
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
        //draw chart & set description for each forward path.
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
//pass in list loops & forward paths to get numerator of Mason's Gain Formula.
function getMasonsNumerator(loops, paths) {
    let pathsNum = paths.length;
    let loopNum = loops.length;
    let loopsPruned, numerator = nerdamer('0'), numeratorComponet, sumNum;
    //for each path, calculate determinant & gain; path determinant only uses loops not touching it.
    for (let pathIndex = 0; pathIndex<pathsNum; pathIndex++) {//loop through loops
        loopsPruned = [];
        //construct list of loops not touching forward path paths[pathIndex]
        for (let loopIndex = 0; loopIndex < loopNum; loopIndex++) {
            if (!loops[loopIndex].isTouchingPath(paths[pathIndex].path)) {
                //only push loop to loopsPruned if it doesn't touch forward path. 
                loopsPruned.push(loops[loopIndex]);
            }
        }
        paths[pathIndex].determinant = getDeterminant(loopsPruned);//get determinant of path
        //path's contribution to numerator will be its determinant * its gain. 
        numeratorComponet = paths[pathIndex].determinant.multiply(paths[pathIndex].gain); 
        numerator = numerator.add(numeratorComponet);//add together componets to get total numerator
        sumNum = pathIndex+1;
        //description of a componet: 
        masonsGainPage.numeratorDesc += `$$G_${sumNum} \\Delta _${sumNum} = ${paths[pathIndex].gain.toString()}\\cdot${paths[pathIndex].determinant.toString()}$$<br>`;
        //add componets to string showing their sum. 
        if (!pathIndex) {//don't want the first one to have a + out front.
            masonsGainPage.numeratorStr += ` ${numeratorComponet.toString()}`;
        }
        else {
            masonsGainPage.numeratorStr += `+ ${numeratorComponet.toString()}`;
        }
    }
    return numerator;
}
/*returns a copy of the object obj.
 If we just assign an object to a variable, the variable gets a reference. 
 This jquery function does not work on arrays. */
function copyObjectJQuery (obj) {
   return jQuery.extend(true, {}, obj);
}
//copy a 1D array.
function copy1DArr(arr) {
    return arr.slice();
}
//returns list of all possible sets of items in 'list' with length 'setlen'
//order is irrelevant.
function getSetsOfCombinations(list, setLen) {
    set = [];
    setOfSets = [];
    getSet(list, set, setLen, 0, 0, setOfSets);
    return setOfSets;
}
//recursively finds list of all possible sets of items in 'list' with length 'setTargetLen'
//and assigns it to 'setOfSets'. listIndex is current index in 'list', setIndex tracks
//length of 'set'.  
function getSet(list, set, setTargetLen, setIndex, listIndex, setOfSets) {
    if (setIndex == setTargetLen) {//when 'set' reaches target length, add it to setOfSets.
        setOfSets.push(set);
    }
    else if (listIndex < list.length) {
        let newSet = copy1DArr(set);//don't need a deep copy since not changing loop attributes.
        let newElement = list[listIndex];
        //based on whether setIndex has been incremented in the last call or not, 
        //choose whether to add the next element in the list to the set
        if (setIndex == set.length) {
            newSet.push(newElement);
        }
        else {
            newSet[setIndex] = newElement;
        }
        listIndex++;
        //for each new value in 'list', call getSet twice: 
        //due to the difference in setIndex,
        //one call will add the new value to its 'set' & the other won't. 
        getSet(list, newSet, setTargetLen, setIndex, listIndex, setOfSets);
        setIndex++;
        getSet(list, newSet, setTargetLen, setIndex, listIndex, setOfSets);
    }
}
//use adjacency list of nodes to get array of loops
function getLoops (nodeList, forwardNodeList) {
    let loops = [];
    for (let i=0; i<nodeList.length; i++) {//iterate through nodes
        for (let j=0; j<nodeList[i].length; j++) {//iterate through list of edges
            if (nodeList[i][j].endNode < i) {//found edge pointing backwards
                //loops.push(new Loop(i, nodeList[i][j], nodeList));
                //addLoops(to, from, backwardGain, adjacencyList, loopList)
                addLoops(nodeList[i][j].endNode, i, nodeList[i][j].gain, forwardNodeList, loops);
            }
        }
    }
    return loops;
}
//calculate determinant of list of loops using an array of loops.
//makeNonTouchingLoopsList flag tells whether we need to make an list of non-touching loops.
//assume at least one loop. 
function getDeterminant (loops, makeNonTouchingLoopsList) {
    let determinant = nerdamer('1'), loopNum = loops.length, det, detComponet;
    let set, sets, label = ``;
    for (let i=1; i<=loopNum; i++) {
        sets = getSetsOfCombinations(loops, i);//get possible sets of length i
        detComponet = nerdamer('0');
        for (let j=0; j<sets.length; j++) {
            //loop through sets and add determinant of set if none of the loops in the set share a node.
            set = sets[j];
            det = getNLoopsGain(set, set.length, makeNonTouchingLoopsList);
            determinant = determinant.add(det);//construct sum of all determinants of all sets of non-touching loops
            detComponet = detComponet.add(det);//construct sum of determinants of sets of non-touching loops of length i
        }
        if (!detComponet.symbol.multiplier.num.value) {
            //if one componet = 0, then all componets with sets of length > i will also be zero.
            break;
        }
        if (makeNonTouchingLoopsList) {
            //add description for the determinant componet to the
            //strings that will be used to describe denominator in html.
            masonsGainPage.denominatorStr += `+ ${detComponet.toString()}`;
            for (let j=0; j<i; j++) {
                label+=`L_${masonsGainPage.loopLabels[j]}`;
            }//is .replace(/\*/g,"\\cdot") worth the time?
            masonsGainPage.denominatorDesc += `$$(-1)^i \\cdot \\sum_{} {${label}}: ${detComponet.toString()}$$<br>`;
            label = ``;
        }
    }
    return determinant;
}
//get gain contribution for a specific set of non-touching loops.
function getNLoopsGain(loops, loopNum, makeNonTouchingLoopsList) {
    let gainComponet = nerdamer('1');
    let j;
    if (loopNum > 1) {
        for (let i=0; i<loopNum; i++) {
            j = i+1;
            while (j < loopNum) {
                //if any loops in the collection share a node, contributin is 0 since must be non-touching.
                if (doLoopsShareANode(loops[i], loops[j])) {
                    return 0;
                }
                j++;
            }
            //multiply loop gains together to get gain componet.
            gainComponet = loops[i].gain.multiply(gainComponet);
        }
        if (makeNonTouchingLoopsList) {
            masonsGainPage.nonTouchingLoops.push(new LoopCollection(loops, gainComponet));
            //if set of loops don't touch, push them to the list of non-touching loops. 
        }
    }
    else {//if only 1 loop, gain componet is that loop's gain.
        gainComponet = loops[0].gain;
    }
    //gain componet's sign depends on how many loops there are in the collection.
    return gainComponet.multiply(Math.pow(-1, loopNum).toString());
}
//returns 1 if the loops share a node, else returns 0.
//can't share an edge w/o sharing a node.
function doLoopsShareANode (loop1, loop2) {//loop objects as parametrs
    //if either endpoint of one loop is inside the other loop, then they share a node.
    if (loop1.to <= loop2.from && loop1.to >= loop2.to) {
        return 1;
    }
    if (loop1.from <= loop2.from && loop1.from >= loop2.to) {
        return 1;
    }
    return 0;
}
//uncheck radio box saying to submit edge list through a file
function uncheckFileSubmit() {
    masonsGainPage.fileSubmit.checked = 0;
}
//uncheck radio button saying to submit edge list through table
function uncheckTableSubmit() {//uncheckTableSubmit
    masonsGainPage.tableSubmit.checked = 0;
}
//called when Get Sample button is clicked. creates a sample edge list in the table.
function getSample() {
    for (let i=0; i<7; i++) {//add several rows of edges connected to each other.
        addRow();
    }
    let rows = masonsGainPage.table.rows;
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
    let rows = masonsGainPage.table.rows;
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
    let nodes = [], newX, line, sinkNode = masonsGainPage.sinkNode;
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
        draw.text(adjacencyList[i][0].gain.toString()).move(arrowXStartCoord+xInterval*i, startY-5).fill(color);
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
                    draw.text(adjacencyList[node][adjItemIndex].gain.toString()).move(middleX-5, startY-35);
                }
                else {//points backwards, is a loop.
                    if (node == loop.from && endNode == loop.to) {
                        color = pinkHex;
                    }
                    drawPath(draw, nodes[node], nodes[endNode], color);
                    arrow(draw, color, middleX, startY+15, 0);
                    draw.text(adjacencyList[node][adjItemIndex].gain.toString()).move(middleX-5, startY+15).fill(color);
                }
                color = blackHex;//set back to black by default.
            }    
        }
    }
    let node = adjacencyList.length-1;
    if (node == sinkNode) {//last one is sink node.
        edgeListLen = adjacencyList[node].length;
        for (let adjItemIndex = 0; adjItemIndex < edgeListLen; adjItemIndex++) {
            endNode = adjacencyList[node][adjItemIndex].endNode;
            middleX = nodes[node][0]+(nodes[endNode][0]-nodes[node][0])/2;
            if (endNode < node) {//forms a loop; since is sink node, no more forward paths.
                if (node == loop.from && endNode == loop.to) {
                    color = pinkHex;
                }
                drawPath(draw, nodes[node], nodes[endNode], color);
                arrow(draw, color, middleX, startY+15, 0);
                draw.text(adjacencyList[node][adjItemIndex].gain.toString()).move(middleX-5, startY+15);
            }
            color = blackHex;
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
    let nodes = [], newX, line, loopIndex = 0, sinkNode = masonsGainPage.sinkNode;
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
        draw.text(adjacencyList[i][0].gain.toString()).move(arrowXStartCoord+xInterval*i, startY-5).fill(color);
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
                    draw.text(adjacencyList[node][adjItemIndex].gain.toString()).move(middleX-5, startY-35);
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
                    draw.text(adjacencyList[node][adjItemIndex].gain.toString()).move(middleX-5, startY+15).fill(color);
                }
                color = blackHex;//set back to black by default.
            }    
        }
    }
    let node = adjacencyList.length-1;
    if (node == sinkNode) {//last one is sink node.
        edgeListLen = adjacencyList[node].length;
        for (let adjItemIndex = 0; adjItemIndex < edgeListLen; adjItemIndex++) {
            endNode = adjacencyList[node][adjItemIndex].endNode;
            middleX = nodes[node][0]+(nodes[endNode][0]-nodes[node][0])/2;
            if (endNode < node) {//forms a loop; since is sink node, no more forward paths.
                if (loop) {
                    if (node == loop.from && endNode == loop.to) {
                        color = pinkHex;
                        loopIndex++;
                        loop = loopSet[loopIndex];
                    }
                }
                drawPath(draw, nodes[node], nodes[endNode], color);
                arrow(draw, color, middleX, startY+15, 0);
                draw.text(adjacencyList[node][adjItemIndex].gain.toString()).move(middleX-5, startY+15);
            }
            color = blackHex;
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
        draw.text(adjacencyList[i][0].gain.toString()).move(arrowXStartCoord+xInterval*i, startY-5).fill(color);
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
                    draw.text(adjacencyList[node][adjItemIndex].gain.toString()).move(middleX-5, startY-35).fill(color);
                }
                else {//points backwards, is a loop.
                    drawPath(draw, nodes[node], nodes[endNode], color);
                    arrow(draw, color, middleX, startY+15, 0);
                    draw.text(adjacencyList[node][adjItemIndex].gain.toString()).move(middleX-5, startY+15).fill(color);
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
            temp = copyObjectJQuery(loopSet[0]);
            loopSet[0] = copyObjectJQuery(loopSet[1]);
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
    let color = blackHex;
    let diameter = 5;
    let plotXWidth = 300;
    let yLineCorrection = 2.5;
    let xLineCorrection = 2.5;
    let xInterval = parseInt(plotXWidth/nodeNum);//parseInt(plotXWidth/nodeNum)
    let arrowXStartCoord = startX+parseInt(xInterval/2)+4;
    var draw = SVG().addTo('#'+id).size(plotXWidth, 130), last = nodeNum-1;
    let nodes = [], newX, sinkNode = masonsGainPage.sinkNode;
    for (let i=0; i<last; i++) {
        newX = startX+xInterval*i;
        nodes.push([newX+2, startY]);//nodes[0] has x & y coordinates for node 0.
        draw.circle(diameter).fill(color).move(newX, startY);
        arrow(draw, color, arrowXStartCoord+xInterval*i, startY+yLineCorrection);
        draw.text(adjacencyList[i][0].gain.toString()).move(arrowXStartCoord+xInterval*i, startY-5);
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
                if (node < endNode) {//points forward/rightward.
                    drawPath(draw, nodes[node], nodes[endNode], color, 20, 1);
                    arrow(draw, color, middleX, startY-15);
                    draw.text(adjacencyList[node][adjItemIndex].gain.toString()).move(middleX-5, startY-35);
                }
                else {//points backwards, is a loop.
                    drawPath(draw, nodes[node], nodes[endNode], color);
                    arrow(draw, color, middleX, startY+15, 0);
                    draw.text(adjacencyList[node][adjItemIndex].gain.toString()).move(middleX-5, startY+15);
                }
            }    
        }
    }
    let node = adjacencyList.length-1;
    if (node == sinkNode) {//last one is sink node.
        edgeListLen = adjacencyList[node].length;
        for (let adjItemIndex = 0; adjItemIndex < edgeListLen; adjItemIndex++) {
            endNode = adjacencyList[node][adjItemIndex].endNode;
            middleX = nodes[node][0]+(nodes[endNode][0]-nodes[node][0])/2;
            if (endNode < node) {//forms a loop; since is sink node, no more forward paths.
                drawPath(draw, nodes[node], nodes[endNode], color);
                arrow(draw, color, middleX, startY+15, 0);
                draw.text(adjacencyList[node][adjItemIndex].gain.toString()).move(middleX-5, startY+15);
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