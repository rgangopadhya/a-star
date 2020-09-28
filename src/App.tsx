import React, { useState } from 'react';
import './App.css';
/*
 We want to have a graph which we render and solve over

 For rendering, to simplify, we just want a matrix.

 Thus, each node has position, and cost to each neighbor

 Structure:
 */
const GRID_SIZE = 10;
type Edge = {
  cost: number;
  from_node: Node;
  to_node: Node;
};

type Point = [number, number];

type NodeId = number;

 type Node = {
  neighbors: Array<Edge>;
  // location: for rendering
  location: Point;
  id: NodeId;
  cost: number;
 };

type Path = Array<Node>;
type Grid = Array<Array<Node>>;

type QueueItem<T> = { item: T, weight: number };
type MaybeQueueItem<T> = QueueItem<T> | undefined;

class PriorityQueue<T> {
  /*
    PriorityQueue implementation as heap

         100
        /   \
       80    10
      / \    /   \
    30   9  6    0
          /  
         1

          80
        /   \
             10
            /   \
     30 9  6    0
         /  
        1

          80
        /   \
       30    10
        \   /   \
        9  6    0
         /  
        1

    As opposed to a straight unordered list, where insertion is O(1), but popping is O(N),
    a heap gives O(logN) inserting and popping.

    Why? To pop, you take the root element. Then, you need to pick the candidate for the next max.
      When you move that candidate, what do you need to do?
       * root's children: pick the greater as newRoot
       * make child of newRoot: the original other child, and if newRoot had any other children,
         combine them: pick the greater, and make the other a child of that newRootChild. 

      This is clearly recursive. What is the operation? promote? and then call promote on the children
      When does it stop? When the promoted doesnt have 2 children (just one or none). In that case, you can just
        attach the other child to it with no modification necessary

      Data structure: an array where the parent is in position i, then the children are in [2i, 2i+1]?
          this works since for given i, the result is unique. That's all we care about

      How does insertion work? You start at the top. If greater than root, it becomes root and you make it a child, 
        have to pick between the two existing children. Would it matter which one?
   */
  _heap: Array<MaybeQueueItem<T>>;

  constructor() {
    this._heap = [];
  }

  /*
   * To add, we need to insert it in the right place to ensure the heap property
   * Start at the bottom. swap until it is less than its parent
  */
  add(element: T, priority: number) {
    const newItem = { item: element, weight: priority };
    this._heap.push(newItem);
    let currIndex = this.size() - 1;
    let parentIndex = Math.floor(currIndex / 2)
    let parentItem = this._heap[parentIndex];
    while (this.isGreater(newItem, parentItem)) {
      this.swap(parentIndex, currIndex);
      currIndex = parentIndex;
      parentIndex = Math.floor(currIndex / 2);
      parentItem = this._heap[parentIndex];
    }
  }

  pop(): T | undefined {
    /*
     Take the last item and make it the first, then sift down until it is >= both of its children
   */
    const result = this.peek();
    const item = this._heap.pop();
    if (this.size() === 0) {
      return result?.item;
    }
    let itemIndex = 0;
    this._heap[itemIndex] = item;
    let children = this.getChildren(itemIndex);
    while (this.isGreater(children[0], item) || this.isGreater(children[1], item)) {
      const swapTo = this.isGreater(children[0], children[1]) ? this.leftIndex(itemIndex) : this.rightIndex(itemIndex);
      this.swap(swapTo, itemIndex);
      itemIndex = swapTo;
      children = this.getChildren(itemIndex);
    }
    return result?.item;
  }

  swap(indexA: number, indexB: number): void {
      [this._heap[indexA], this._heap[indexB]] = [this._heap[indexB], this._heap[indexA]];
  }

  size() {
    return this._heap.length;
  }

  isEmpty() {
    return this.size() === 0;
  }

  peek() {
    // return highest-priority element but dont modify the queue
    return this._heap[0];
  }

  getChildren(i=0): [MaybeQueueItem<T>, MaybeQueueItem<T>] {
    return [this._heap[this.leftIndex(i)], this._heap[this.rightIndex(i)]];
  }

  isGreater(childA: MaybeQueueItem<T>, childB: MaybeQueueItem<T>): boolean {
    if (childA && childB) {
      return childA.weight > childB.weight;
    }
    return childA ? true : false;
  }

  leftIndex(i=0) {
    return 2 * i + 1;
  }

  rightIndex(i=0) {
    return 2 * i + 2;
  }
}

/*
 Given a start Node/point, and given a destination Node/point, find the shortest path (in terms
  of number of steps first, then by cost. Implementation-wise let's start with number of steps)


  Sequence:
    take current node. if it is not the end, add neighbors to queue
      
    current node => first in queue


    Graph 
 */

function breadthFirstSearch({ startNode, endNode }: { startNode: Node, endNode: Node }): Path {
  const frontier: Array<Node> = [startNode];
  const cameFrom: Record<NodeId, Node | null> = {[startNode.id]: null};
  while (frontier.length !== 0) {
    const currNode = frontier[0];
    frontier.shift();
    if (currNode.id === endNode.id) {
      break;
    }
    currNode.neighbors.forEach((neighbor) => {
      const next = neighbor.to_node;
      if (cameFrom[next.id]) {
        return;
      }
      frontier.push(next);
      cameFrom[next.id] = currNode;
    });
  }
  
  let current = endNode;
  const path: Path = [];
  while (current.id !== startNode.id) {
    path.push(current);
    current = cameFrom[current.id] || endNode;
  };
  path.push(startNode);
  return path.reverse();
}

type NodeAndCost = {
  node: Node;
  cost: number;
};

type PathWithCost = Array<NodeAndCost>;

function uniformCostSearch({ startNode, endNode }: { startNode: Node, endNode: Node}): PathWithCost {
  const frontier: PriorityQueue<Node> = new PriorityQueue();
  frontier.add(startNode, 0);
  // this needs to change. there can actually be multiple ways to get to the same item.
  // so, we should keep track of the cost. If it is less, update.
  // we should keep track of the cost to get to a given node... 
  // when we reach a node, we need to take the cost to get to the prior node and sum.
  // where is the cost to the prior node? currNode
  const cameFrom: Record<NodeId, NodeAndCost> = {[startNode.id]: {node: startNode, cost: 0}};
  while (frontier.size() !== 0) {
    const currNode = frontier.pop() || startNode;
    const costToNode = cameFrom[currNode.id].cost;
    currNode.neighbors.forEach((neighbor) => {
      const next = neighbor.to_node;
      const costWithNeighbor = costToNode + next.cost;
      const previousCost = cameFrom[next.id]?.cost;
      if (previousCost <= costWithNeighbor) {
        return;
      }
      frontier.add(next, next.cost);
      cameFrom[next.id] = { node: currNode, cost: costWithNeighbor };
    });
  }
  
  let current = cameFrom[endNode.id];
  const path: PathWithCost = [];
  while (current && current.node.id !== startNode.id) {
    path.push(current);
    current = cameFrom[current?.node.id];
  };
  path.push({node: startNode, cost: 0});
  return path.reverse();
}

function makeGrid(): Grid {
  const grid: Grid = Array.from(Array(GRID_SIZE).keys()).map((i) => {
    return Array.from(Array(GRID_SIZE).keys()).map((j) => {
      const node: Node = {
        neighbors: [],
        location: [i, j],
        id:  i * 20 + j * Math.pow(20, 2),
        cost: 1,
      };
      return node;
    });
  });
  populateNeighbors(grid);
  return grid;
}
/*
 i: row
 j: column
 [
  [(0, 0), (1,0), (2, 0), ... (19, 0)],
  [(0, 1), (1, 1), (2, 1).... (19, 1)],
 ]
 */
function populateNeighbors(grid: Array<Array<Node>>): void {
  const makeEdge = (x: number, y: number, from_node: Node): Edge => ({
    from_node,
    to_node: grid[x][y],
    cost: from_node.cost,
  });
  grid.forEach((row, i) => {
    row.forEach((node, j) => {
      if (j > 0) {
        node.neighbors.push(makeEdge(i, j - 1, node));
      }
      if (i > 0) {
        node.neighbors.push(makeEdge(i - 1, j, node));
      }
      if (i < GRID_SIZE - 1) {
        node.neighbors.push(makeEdge(i + 1, j, node));
      }
      if (j < GRID_SIZE - 1) {
        node.neighbors.push(makeEdge(i, j + 1, node));
      }
    });
  });
}

function App() {
  const [grid, setGrid] = useState(makeGrid());
  const startNode = grid[9][7];
  const endNode = grid[0][0];
  const pathWithCost = uniformCostSearch({ startNode, endNode });
  const init: Record<number, Node> = {};
  const pathById = pathWithCost.reduce((acc, curr) => {
    acc[curr.node.id] = curr.node;
    return acc;
  }, init);
  const visitedStyle = {
    backgroundColor: 'red',
  };

  const updateCost = (i: number, j: number, event: any) => {
    // This is a shallow copy... not great in React world, but eh.
    const newCost = parseInt(event.target.value) || 0;
    const newGrid = [...grid];
    const node = newGrid[i][j];
    node.cost = newCost;
    // node.neighbors.forEach(neighbor => neighbor.cost =  newCost);
    console.log("==Updated cost to", node.cost);
    setGrid(newGrid);
  };

  return (
    <div className="App">
      <table>
        <tbody>
          {grid.map((row, i) => (
            <tr key={i}>
              {row.map((node, j) => (
                <td key={j} style={pathById[node.id] !== undefined ? visitedStyle : {}}>
                  <input
                    type="text"
                    onChange={(event) => updateCost(i, j, event)}
                    value={node.cost}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;
