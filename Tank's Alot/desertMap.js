// Part 1 For map Desert
/*
* 数字(1)是我方坦克（不可通行），X 不可摧毁建筑物或树（不可通行）， O 可摧毁的墙（不可通行除非摧毁），H 是补给， M 是陷阱，0是路
*/

let grid;
let grid_new;


function Desert(game) {
  this.game = game;
  grid = new Array(100);
  for (let i = 0; i < 50; i++) {
    grid[i] = new Array(50);
    for (let j = 0;j < 50; j++) {
      grid[i][j] = new Cell(i,j,0);
    }
  }
}

function Cell(theX, theY, theContain) {
  this.x = theX;
  this.y = theY;
  this.contains = theContain;
}


//设定坦克在（0，0）上
Desert.prototype.drawTank = function(){
  grid[0][0].contains = 'T';
}

Desert.prototype.addWall = function() {
  let options = [];
  for (let i = 0; i < 50; i++) {
    for (let j = 0; j < 50; j++) {
      if (grid[i][j].contains === 'O') {
        options.push({
          x: i,
          y: j
        });
      }
    }
  }
  // console.log(options.length);
    //let invalidCells = [{,20}]
    // for (let i = 0; i < 1000; i++) {
    //     let spot = random(options);
    //     //let r = random(1);
    //     //grid[spot.x][spot.y] = r > 0.1 ? 'X' : ' ';
    //     console.log(spot);
    //     grid[spot.x][spot.y].contains = 'X';
    // }
}

fDesert.prototype.avaliablePath = function() {
    let freeCells = []
    for (let i = 0; i < 50; ) {
        for (let j = 0; j < 50; ) {
          if (grid[i][j].contains === 0 || grid[i][j].contains === 'H' || grid[i][j].contains === 'M') {
            options.push({
              x: i,
              y: j
            });
          }
        }

    }
}

// 画出整个地图
Desert.prototype.draw = function() {
  background(255);
  drawGrid();
};

// 画出图中的格子
Desert.prototype.drawGrid = function() {
  let w = 80;
  for (let i = 0; i < 50; i++) {
    for (let j = 0; j < 50; j++) {
      noFill();
      strokeWeight(2);
      stroke(0);
      rect(i* w, j * w, w,w);
      let val = grid[i][j].contains;
      if (grid[i][j].contains !== 0) {
        textAlign(CENTER,CENTER);
        textSize(20);
        fill(0);
        noStroke();
        text(val, i* w + w/2, j * w + w/2);
                 
      }         
    }
    
  }
}





// // Tank four moves
// function moveUp(tank) { // grid as a global variable
//   grid[cell.x][cell.y-1] = cell.contains;
//   cell.contains = cloneMap[cell.x][cell.y].contains;
//   return grid;
  

// }

// function moveDown(tank) {
//   grid[cell.x][cell.y+1] = cell.contains;
//   cell.contains = cloneMap[cell.x][cell.y].contains;
//   return grid;
// }


// function moveLeft(cell) {
//   grid[cell.x-1][cell.y] = cell.contains;
//   cell.contains = cloneMap[cell.x][cell.y].contains;
//   return grid;
// }

// function moveRight(tank) {
//   grid[cell.x+1][cell.y] =cell.contains;
//   cell.contains = cloneMap[cell.x][cell.y].contains;
//   return grid;
// }



// function Tank(theX, theY, theIcon,theHealth) {
//   this.x = theX;
//   this.y = theY;
//   this.icon = theIcon;
//   this.health = theHealth;
//   this.survive = true;
//   this.move = true;
//   this.fire = null;
//   this.skill = null;
// }




