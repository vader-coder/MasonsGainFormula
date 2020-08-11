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
        this.determinantDesc = document.getElementById('determinantStr');
        this.numeratorHTML = document.getElementById('numeratorStr');
        this.table = document.getElementById('table');
        this.pageLinks = document.getElementById('pageLinks');
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
/* Credit for the code in fileHandler() belongs a StackOverflow, 
whose publications use a cc-by-sa license.
Question: https://stackoverflow.com/questions/31746837/reading-uploaded-text-file-contents-in-html
Answer Author: terales https://stackoverflow.com/users/1363799/terales*/
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
//gets list of edges from a table & assigns them to an adjacency list.
//creates seperate adjacency list of only the edges with a forward direction.
function getEdgesFromTable() {
    let rows = masonsGainPage.table.rows;
    let rowNum = rows.length, from, to, gain,
    nodeList = [], nodeNum, forwardNodeList = [], elementsDictionary = [], lastNodeIndex;//reset nodeList to nothing. 
    let i=1, fileStr;//row #0 has the table titles, which we don't want.
    if (rows[i]) {//first one.
        from = parseInt(rows[i].children[0].children[0].value);
        to = parseInt(rows[i].children[1].children[0].value);
        gain = nerdamer(rows[i].children[2].children[0].value);
        fileStr = `${from} ${to} ${gain.toString()}`;
    }
    //while from's are consecutive, add edges to the graph
    while (to == from + 1 && rows[i]) {
        addEdgeToAdjacencyListDict(nodeList, from, to, gain);//each entry of nodelist contains the list of edges attatched to the node represented by its key.
        addEdgeToAdjacencyListDict(forwardNodeList, from, to, gain);
        addEdgeToElementsDict(elementsDictionary, `${from}`, `${to}`, `${gain}`, 'straight');
        if (from > lastNodeIndex) {
            lastNodeIndex = from;
        }
        if (to > lastNodeIndex) {
            lastNodeIndex = to;
        }
        i++;
        if (rows[i]) {
            from = parseInt(rows[i].children[0].children[0].value);
            to = parseInt(rows[i].children[1].children[0].value);
            gain = nerdamer(rows[i].children[2].children[0].value);
            fileStr += `${'\n'}${from} ${to} ${gain.toString()}`;
        }
    }
    lastNodeIndex = nodeList[nodeList.length-1][0].endNode;
    let straightOrCurved;
    while (i<rowNum) {//get the edges between non-consecutive nodes..
        addEdgeToAdjacencyListDict(nodeList, from, to, gain);
        if (!nodeList[from]) {//otherwise, must be from last node.
            nodeNum = nodeList.length;
        }
        if (to > from) {//if edge is pointing forward/rightward, add to forwardNodeList
            addEdgeToAdjacencyListDict(forwardNodeList, from, to, gain);
        }
        if (to == from+1) {
            straightOrCurved = 'straight';
        } else {
            straightOrCurved = 'curved';
        }
        addEdgeToElementsDict(elementsDictionary, `${from}`, `${to}`, `${gain}`, straightOrCurved);
        if (from > lastNodeIndex) {
            lastNodeIndex = from;
        }
        if (to > lastNodeIndex) {
            lastNodeIndex = to;
        }
        i++;
        if (rows[i]) {
            from = parseInt(rows[i].children[0].children[0].value);
            to = parseInt(rows[i].children[1].children[0].value);
            gain = nerdamer(rows[i].children[2].children[0].value);
            fileStr += `${'\n'}${from} ${to} ${gain.toString()}`;
        }
    }
    if (!nodeNum) {
        nodeNum = nodeList.length+1;
    }
    masonsGainPage.fileStr = fileStr;
    masonsGainPage.elementsDict = elementsDictionary;
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
    else if (index < lastNodeIndex) {
        let edge, forwardEdges = adjacencyList[index];
        let forwardEdgesNum = forwardEdges.length;
        for (let i=0; i<forwardEdgesNum; i++) {
            edge = forwardEdges[i];
            getForwardPath(edge.endNode, copy1DArr(path), gain.multiply(edge.gain), adjacencyList, pathArr, lastNodeIndex);
        }
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
    let rowNum = rows.length, lastNodeIndex = 0;//start w/ 0
    let from, to, gain, nodeList = {}, nodeNum, forwardNodeList = {}, elementsDictionary = {};
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
        from = parseInt(rows[i][0]);
        to = parseInt(rows[i][1]);
        gain = nerdamer(rows[i][2]);
    }
    while (to == from + 1 && rows[i]) {
        addEdgeToAdjacencyListDict(nodeList, from, to, gain);
        addEdgeToAdjacencyListDict(forwardNodeList, from, to, gain);
        addEdgeToElementsDict(elementsDictionary, rows[i][0], rows[i][1], rows[i][2], 'straight');
        if (from > lastNodeIndex) {
            lastNodeIndex = from;
        }
        if (to > lastNodeIndex) {
            lastNodeIndex = to;
        }
        i++;
        if (rows[i]) {
            from = parseInt(rows[i][0]);
            to = parseInt(rows[i][1]);
            gain = nerdamer(rows[i][2]);
        }
    }
    //get the edges nonconsecutive nodes not right next to each other.
    let curveClass;
    for (; i<rowNum; i++) {
        from = parseInt(rows[i][0]);
        to = parseInt(rows[i][1]);
        gain = nerdamer(rows[i][2]);
        addEdgeToAdjacencyListDict(nodeList, from, to, gain);
        /*if (nodeList[from]) {
            //nodeList[from].push(new Edge(to, gain));
        }*/
        if (!nodeList[from]) {//otherwise, must be from last node.
            //nodeList.push([new Edge(to, gain)]);
            nodeNum = nodeList.length;
        }
        if (to > from) {//if edge points forward/rightward, add to forwardNodeList
            //forwardNodeList[from].push(new Edge(to, gain));
            addEdgeToAdjacencyListDict(forwardNodeList, from, to, gain);
        }
        if (to == from+1) {
            curveClass = 'straight';
        } else if (to == from) {
            curveClass = 'loop';
        }else {
            curveClass = 'curved';
        }
        addEdgeToElementsDict(elementsDictionary, rows[i][0], rows[i][1], rows[i][2], curveClass);
        if (from > lastNodeIndex) {
            lastNodeIndex = from;
        }
        if (to > lastNodeIndex) {
            lastNodeIndex = to;
        }
    }
    if (!nodeNum) {
        nodeNum = nodeList.length+1;
    }
    masonsGainPage.elementsDict = elementsDictionary;
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
//called to add a new edge to an elements dictionary.
//if either node isn't already in the dictionary, add it to the dictionary of elements.
//then add the edge to the elemetns dictionary.
function addEdgeToElementsDict(elements, fromNodeStr, toNodeStr, gainStr, classStr) {
    if (!elements[fromNodeStr]) {//start node doesn't exist, add it
        elements[fromNodeStr] = {data: { id: fromNodeStr } };
    }
    if (!elements[toNodeStr]) {//end node doesn't exist, add it.
        elements[toNodeStr] = {data: { id: toNodeStr } };
    }
    let edgeStr = fromNodeStr+'->'+toNodeStr;
    elements[edgeStr] = {data: {id: edgeStr, source: fromNodeStr, target: toNodeStr, gain: gainStr}, classes: classStr};
}
//add an edge to a dictionary representing an adjacency list. 
function addEdgeToAdjacencyListDict(nodeList, from, to, gain) {
    if (!nodeList[from]) {
        //if node 'from''s list of edges doesn't already exist in nodeList, then 
        //create one with this edge as the first edge.
        nodeList[from] = [new Edge(to, gain)];
    }
    else {
        //otherwise, add the new edge to the current entry.
        nodeList[from].push(new Edge(to, gain));
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
    
    //rest of onSubmit() draws graphs & updates html. 
    //erase graphs from last time.
    masonsGainPage.loopGraphs.innerHTML = '';
    masonsGainPage.nonTouchingLoopGraphs.innerHTML = '';
    masonsGainPage.pathGraphs.innerHTML = '';

    //signal flow graph without any pink to emphasize one path or loop
    makeGraph('generalChart', Object.values(masonsGainPage.elementsDict));
    //change to show numerator & denominator 
    let detStr = masonsGainPage.determinant.toString();
    masonsGainPage.pathDesc.innerHTML = `Total Signal Flow Graph Gain: $$\\frac{${masonsGainPage.numerator.toString()}}{${detStr}}$$<br>`;
    let loopNum = loops.length;
    let pathNum = pathArr.length, bgColor;
    let yCaption = `$$y_\\text{in}:$$`;
    masonsGainPage.determinantDesc.innerHTML = yCaption+masonsGainPage.denominatorDesc+masonsGainPage.denominatorStr;
    masonsGainPage.numeratorHTML.innerHTML = `$$y_\\text{out}:$$` + masonsGainPage.numeratorDesc+masonsGainPage.numeratorStr;
    MathJax.typeset();//MathJax renders new TeX that JavaScript put into html.
    if (loopNum > 0) {
        //draw chart & show descriptions for each loop
        for (let i=0; i<loopNum; i++) {
            if (i%2) {
                bgColor = 'pink';
            }
            else {
                bgColor = 'blue';
            }
            //insert a discription for a loop.
            masonsGainPage.loopGraphs.insertAdjacentHTML('beforeend', `<div class='${bgColor}'>
            <p>Loop ${i} Gain: ${loops[i].gain.toString()} <a href='#topOfPage'>Top Menu</a></p><div id='loop${i}' class='cytoscapeChart'></div></div>`);
            drawLoopChart(`loop${i}`, loops[i]);
        }
        //draw chart & show descriptions for each collection of non-touching loops.
        for (let i=loopNum%2; i<nonTouchingLoops.length; i++) {
            if (i%2) {
                bgColor = 'pink';
            }
            else {
                bgColor = 'blue';
            }
            masonsGainPage.nonTouchingLoopGraphs.insertAdjacentHTML('beforeend', `<div class='${bgColor}'>
            <p>${nonTouchingLoops[i].length} Loops in Non-Touching Loops Set #${i} Gain: ${nonTouchingLoops[i].gain.toString()} <a href='#topOfPage'>Top Menu</a></p>
            <div id='nonTouchingLoop${i}' class='cytoscapeChart'></div></div>`);
            drawNonTouchingLoopSetChart(`nonTouchingLoop${i}`, nonTouchingLoops[i].loops);
        }
    }
    if (pathNum > 0) {
        //draw chart & set description for each forward path.
        for (let i=0; i<pathNum; i++) {
            if (i%2) {
                bgColor = 'pink';
            }
            else {
                bgColor = 'antiqueWhite';
            }
            masonsGainPage.pathGraphs.insertAdjacentHTML('beforeend', `<div class='${bgColor}'>
            <p>Forward Path ${i} Gain: ${pathArr[i].gain.toString()} <a href='#topOfPage'>Top Menu</a></p><div id='path${i}' class='cytoscapeChart'></div></div>`);
            drawPathChart(`path${i}`, pathArr[i]);
        }
    }
    //display menu on page. 
    masonsGainPage.pageLinks.innerHTML = `<div id='menu'>Menu: <br><a href='#generalChart'>Plain Signal Flow Graph</a><br><a href='#loopGraphs'>Individual Loop Charts</a><br><a href='#nonTouchingLoopGraphs'>Non-Touching Loops Charts</a><br><a href='#forwardPathGraphs'>Forward Path Charts</a></div>`;
}
//pass in lists of loops & forward paths to get numerator of Mason's Gain Formula.
function getMasonsNumerator(loops, paths) {
    let pathsNum = paths.length;
    let loopNum = loops.length;
    let loopsPruned, numerator = nerdamer('0'), numeratorComponet, sumNum;
    //for each path, calculate determinant & gain; path determinant only uses loops not touching it.
    for (let pathIndex = 0; pathIndex<pathsNum; pathIndex++) {//loop through paths
        loopsPruned = [];
        //construct list of loops not touching forward path paths[pathIndex]
        for (let loopIndex = 0; loopIndex < loopNum; loopIndex++) {//loop through loops
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
        //add componets to a string showing their sum. 
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
//shallow copy of a 1D array.
function copy1DArr(arr) {
    return arr.slice();
}
//returns list of all possible subsets with length 'setlen' of set of items in 'list'
//order is irrelevant. items can be anything, including numbers, strings, and objects.
function getSetsOfCombinations(list, setLen) {
    set = [];
    setOfSets = [];
    getSet(list, set, setLen, 0, 0, setOfSets);
    return setOfSets;
}
//recursively finds list of all possible subsets with length 'setlen' of set of items in 'list'
//and appends it to 'setOfSets'. listIndex is current index in 'list', setIndex tracks
//length of 'set'.  
function getSet(list, set, setTargetLen, setIndex, listIndex, setOfSets) {
    if (setIndex == setTargetLen) {//when 'set' reaches target length, add it to setOfSets.
        setOfSets.push(set);
    }
    else if (listIndex < list.length) {
        let newSet = copy1DArr(set);//shallow copy is sufficient since not changing loop attributes.
        let newElement = list[listIndex];//newer item is the next element in 'list'.
        if (setIndex == set.length) {
            //if setIndex was incremented immediately before the current function call,
            //then append the new item to the list
            newSet.push(newElement);
        }
        else {//otherwise, switch out the last item for the newest item.
            newSet[setIndex] = newElement;
        }
        listIndex++;
        //call getSet twice: 
        //due to the difference in setIndex,
        //if listIndex < list.length & setindex != setTargetLen,
        //first call will switch the last item with a newer item,
        //the second will append a newer item to the list.
        getSet(list, newSet, setTargetLen, setIndex, listIndex, setOfSets);
        setIndex++;
        getSet(list, newSet, setTargetLen, setIndex, listIndex, setOfSets);
    }
}
//use adjacency list of nodes to get array of loops
function getLoops (nodeList, forwardNodeList) {
    let loops = [];
    for (let [key, edges] of Object.entries(nodeList)) {//iterate through nodes
        for (let j=0; j<edges.length; j++) {//iterate through list of edges in current node
            if (edges[j].endNode <= key) {
                //found edge pointing backwards, add loops associated with that edge to the list of loops.
                addLoops(edges[j].endNode, key, edges[j].gain, forwardNodeList, loops);
            }
        }
    }
    return loops;
}
//calculate determinant of list of loops using an array of loops.
//makeNonTouchingLoopsList flag tells whether we need to make an list of non-touching loops.
//assume at least one loop in list. 
function getDeterminant (loops, makeNonTouchingLoopsList) {
    let determinant = nerdamer('1'), loopNum = loops.length, det, detComponet;
    let set, sets, label = ``;
    for (let i=1; i<=loopNum; i++) {
        sets = getSetsOfCombinations(loops, i);//get all possible sets (subsets of 'loops') of length i
        detComponet = nerdamer('0');
        for (let j=0; j<sets.length; j++) {
            //loop through sets and add determinant of set if none of the loops in the set share a node.
            set = sets[j];
            det = getNLoopsGainProduct(set, set.length, makeNonTouchingLoopsList);
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
            }
            masonsGainPage.denominatorDesc += `$$(-1)^${i} \\cdot \\sum_{} {${label}}: ${detComponet.toString()}$$<br>`;
            label = ``;
        }
    }
    return determinant;
}
//get product of gains for a set of non-touching loops.
//this is the L_i*L_j*L_k part of the formula.
function getNLoopsGainProduct(loops, loopNum, makeNonTouchingLoopsList) {
    let gainProduct = nerdamer('1');
    let j;
    if (loopNum > 1) {
        for (let i=0; i<loopNum; i++) {
            j = i+1;
            while (j < loopNum) {
                //if any loops in the collection touch, gain product is 0 
                //since we only want product of gains of loops in a set of non-touching loops.
                if (doLoopsTouch(loops[i], loops[j])) {
                    return 0;
                }
                j++;
            }
            //multiply loop gains together to get gain componet.
            gainProduct = loops[i].gain.multiply(gainComponet);
        }
        if (makeNonTouchingLoopsList) {
            masonsGainPage.nonTouchingLoops.push(new LoopCollection(loops, gainProduct));
            //if set of loops don't touch, push them to the list of non-touching loop sets. 
        }
    }
    else {//if only 1 loop, product of gains is that loop's gain.
        gainProduct = loops[0].gain;
    }
    //product of gains' sign depends on how many loops there are in the collection.
    return gainProduct.multiply(Math.pow(-1, loopNum).toString());
}
//returns 1 if the loops touch, otherwise returns 0.
function doLoopsTouch (loop1, loop2) {//loop objects as parametrs
    //if either endpoint of one loop is inside the other loop, then they touch
    //this only works if nodes are laid out in an increasing order (no 2 5 6 3)
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
//called when Generate Sample button is clicked. creates a sample edge list in the table.
function generateSample() {
    for (let i=0; i<7; i++) {//add several rows of edges connected to each other.
        addRow();
    }
    let rows = masonsGainPage.table.rows;
    let last = rows.length-1;
    rows[last].children[0].children[0].value = 4;
    rows[last].children[1].children[0].value = 2;
    rows[last].children[2].children[0].value = 5;
    rows[2].children[2].children[0].value = 3;
}
//add row to table with a gain of one.
function addRow() {
    let html = `<tr>
    <td><input type='text' class='from' value='${rowIndex}'></input></td>
    <td><input type='text' class='to' value='${rowIndex+1}'></td>
    <td><input type='text' class='gain' value='1'></input></td>
    </tr>`;
    $('#table').append(html);
    rowIndex++;
}
//deletes last row from table
function removeLastRow() {
    let rows = $('#table tr');
    if (rows.length > 1) {
        rows.last().remove();
    }
    rowIndex--;
}
//empties table by setting html table to default.
function removeAllRows() {
    $('#table').html(`<tr>
    <th>from</th>
    <th>to</th>
    <th>gain</th>
  </tr>`);
  rowIndex = 0;
}
//draw chart for loop in DOM element w/ id 'id'
function drawLoopChart(id, loop) {
    let elements = copyObjectJQuery(masonsGainPage.elementsDict);
    //elements = dictionary containing nodes & edges in a format that makeGraph() can graph.
    let path = loop.path;
    let pathLen = path.length;
    //turn all nodes & edges in loop path pink
    elements[path[0].toString()].classes = 'pink';
    for (let i=1; i<pathLen; i++) {
        elements[`${path[i]}`].classes = 'pink';//current node
        elements[`${path[i-1]}->${path[i]}`].classes += ' pink';//edge between previous node and current node
    }
    elements[`${loop.from}->${loop.to}`].classes += ' pink';//turn backwards loop edge pink.
    makeGraph(id, Object.values(elements));
}
//draw chart for set of non-touching loops in DOM element w/ id 'id'
function drawNonTouchingLoopSetChart(id, loopSet) {
    let elements = copyObjectJQuery(masonsGainPage.elementsDict), path, pathLen, loopNum = loopSet.length, loop;
    for (let loopIndex=0; loopIndex<loopNum; loopIndex++) {//loop through set of loops
        loop = loopSet[loopIndex];
        path = loop.path;
        pathLen = path.length;
        //turn all nodes & edges in loop the path pink
        elements[path[0].toString()].classes = 'pink';
        for (let i=1; i<pathLen; i++) {
            elements[`${path[i]}`].classes = 'pink';//current node
            elements[`${path[i-1]}->${path[i]}`].classes += ' pink';//edge between previous node and current node
        }
        elements[`${loop.from}->${loop.to}`].classes += ' pink';//turn backwards loop edge pink.
    }
    makeGraph(id, Object.values(elements));
}
//draw chart for forward path in DOM element w/ id 'id'
function drawPathChart(id, pathObj) {
    let elements = copyObjectJQuery(masonsGainPage.elementsDict);
    let path = pathObj.path;
    let pathLen = path.length;
    //turn all nodes & edges in the path pink
    elements[path[0].toString()].classes = 'pink';
    for (let i=1; i<pathLen; i++) {
        elements[`${path[i]}`].classes = 'pink';//current node
        elements[`${path[i-1]}->${path[i]}`].classes += ' pink';//edge between previous node and current node
    }
    makeGraph(id, Object.values(elements));
}
//use cytoscape library to make an svg graph in DOM element w/ id 'id' using array of elements (nodes & edges)
function makeGraph(id, elements) {
    cytoscape({
        container: document.getElementById(id), // container to render in
         elements: elements,
      
        style: [ // the stylesheet for the graph
          {
            selector: 'node',
            style: {
              'background-color': '#000',//black nodes
              'label': 'data(id)'
            }
          },
          {
              selector: 'node.pink',
              style: {
                  'background-color': '#e75480'
              }
          },
          {
            selector: 'edge',
            style: {
                'width': 2,
                'line-color': '#000',
                'target-arrow-color': '#000',
                'target-arrow-shape': 'triangle',  
                'label': 'data(gain)'
            }
          },
          { 
              selector: 'edge.pink',
              style: {
                'line-color': '#e75480',
                'target-arrow-color': '#e75480'
              }
          },
          {
            selector: '.straight',//edges
            style: {
              'curve-style': 'straight'//bezier
            }
          },
          {
            selector: '.curved',//edges
            style: {
              'curve-style': 'unbundled-bezier'
            }
          },
          {
              selector: '.loop',
              style: {
                  'curve-style': 'loop'
              }
          }
        ],
        layout: {
          name: 'grid',
          rows: 1
        }     
      });
}