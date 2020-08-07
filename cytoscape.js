function makeGraph() {
    cytoscape({

        container: document.getElementById('graph'), // container to render in
      
        /*elements: [ // list of graph elements to start with
          { data: { id: '0' }},
          { data: { id: '1' }},
          { data: { id: '2'}},
          { data: { id: '3' }},
          { data: { id: '4'}},
          { data: { id: '0->1', source: '0', target: '1', gain: '1' }, classes: 'straight'}, //edge
          { data: { id: '1->2', source: '1', target: '2', gain: '1' }, classes: 'straight'},
          { data: { id: '3->4', source: '3', target: '4', gain: '1' }, classes: 'straight'},
          { data: { id: '1->3', source: '1', target: '3', gain: '1' }, classes: 'curved'},
          { data: { id: '2->4', source: '2', target: '4', gain: '1' }, classes: 'curved'},
          { data: { id: '3->2', source: '3', target: '2', gain: '1' }, classes: 'curved'}
         ],*/
         elements: [ // list of graph elements to start with
            { data: { id: 'X1' }},
            { data: { id: 'X2' }},
            { data: { id: 'X3'}},
            { data: { id: 'X4'}},
            { data: { id: 'X8' }, classes: 'pink'},
            { data: { id: 'X5'}},
            { data: { id: 'X6'}},
            { data: { id: 'X7'}},
            { data: { id: 'X1->X2', source: 'X1', target: 'X2', gain: '1' }, classes: 'straight'}, 
            { data: { id: 'X2->X3', source: 'X2', target: 'X3', gain: '1' }, classes: 'straight'},
            { data: { id: 'X3->X4', source: 'X3', target: 'X4', gain: '1' }, classes: 'straight pink'},
            { data: { id: 'X4->X8', source: 'X4', target: 'X8', gain: '1' }, classes: 'straight'},
            { data: { id: 'X1->X5', source: 'X1', target: 'X5', gain: '1' }, classes: 'curved'}, 
            { data: { id: 'X5->X6', source: 'X5', target: 'X6', gain: '1' }, classes: 'curved'},
            { data: { id: 'X6->X7', source: 'X6', target: 'X7', gain: '1' }, classes: 'curved'},
            { data: { id: 'X7->X8', source: 'X7', target: 'X8', gain: '1' }, classes: 'curved'},
            { data: { id: 'X6->X5', source: 'X6', target: 'X5', gain: '1' }, classes: 'curved'},
            { data: { id: 'X7->X6', source: 'X7', target: 'X6', gain: '1' }, classes: 'curved pink'},
            { data: { id: 'X3->X2', source: 'X3', target: 'X2', gain: '1' }, classes: 'straight'},
            { data: { id: 'X4->X3', source: 'X4', target: 'X3', gain: '1' }, classes: 'straight'}
           ],
      
        style: [ // the stylesheet for the graph
          {
            selector: 'node',
            style: {
              'background-color': '#000',
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
            selector: 'edges',
            style: {
                'width': 3,
                'line-color': '#000',
                'target-arrow-color': '#000',
                'target-arrow-shape': 'triangle',  
                'label': 'data(gain)'
            }
          },
          { 
              selector: 'edges.pink',
              style: {
                'line-color': '#e75480',
                'target-arrow-color': '#e75480'
              }
          },
          {
            selector: '.straight',//edges
            style: {
              'curve-style': 'bezier'
            }
          },
          {
            selector: '.curved',//edges
            style: {
              'curve-style': 'unbundled-bezier',
            }
          }
        ],
      
        layout: {
          name: 'grid',
          rows: 1
        }
      
      });
}