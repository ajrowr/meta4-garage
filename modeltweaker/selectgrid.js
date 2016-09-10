
/* Grid items are the things currently being displayed and are drawables */
/* Data items are the backing store of generic whatevers to which the grid items map. */
/* Think of the set of grid items as a movable "window" onto the data items */
/* Grid is not responsible for creating the gridItems, rather it yields the data items */
/* for a range and the app uses that info to build the gridItems, which are then */
/* set directly into grid.gridItems by index. */
/* Eg. */
/* myItems = grid.getDataForCurrentRange(); */
/* for (var i=0; i<myItems.length; i++) {grid.gridItems[i] = <object built from myItems[i]>} */
/* Note that the gridItems can actually be whatever since the grid isn't responsible for displaying them. */
/* They don't have to be directly drawable but if they don't respond meaningfully to .interact() */
/* then they won't be doing much ... */
var SelectGrid = function (params) {
    var p = params || {};
    this.scale = p.scale || 1;
    this.perRow = p.perRow || 10;
    this.rowHeight = p.rowHeight || 1;
    this.offset = {x:p.offset.x||0.0, y:p.offset.y||0.0, z:p.offset.z||0.0};
    
    this.rows = p.rows || 4;
    this.columns = p.columns || 8;
    
    this._arrangingIdx = 0;
    
    this.currentRange = {
        start:0, length: 32, end:32
    }
    this.selectedIdx = 0;
    this.selectCaret = {row:0,column:0};
    this.dataItems = []
    this.gridItems = [];
    this.specialSelection = null;
    this.specialItems = {PAGE_LEFT: null, PAGE_RIGHT: null};
    
    this.ellipseScale = p.ellipseScale || {
        width: 1.3, depth: -0.6
    };
    
    this.hasFocus = null;
    
}

SelectGrid.prototype.setDisplayItemAtIndex = function (dispItem, idx) {
    this.gridItems[idx] = dispItem;
    if (this.hasFocus && idx == this.getSelectedIndex()) dispItem.interact('select');
}

SelectGrid.prototype.setRange = function (rStart, rLength) {
    if (rLength == null) {
        rLength = this.currentRange.length;
    }
    var range = {
        start: rStart,
        length: rLength,
        end: Math.min(rStart+rLength, this.dataItems.length)
    };
    range.isStart = range.start == 0;
    range.isEnd = range.end == this.dataItems.length;
    this.currentRange = range;
    this._arrangingIdx = 0;
    return this.currentRange;
}

SelectGrid.prototype.changePage = function (rel) {
    if (rel==1) {
        this.setRange(this.currentRange.end);
    }
    else if (rel==-1) {
        this.setRange(Math.max(0, this.currentRange.start - this.currentRange.length))
    }
    console.log(this.currentRange);
}

SelectGrid.prototype.setData = function (items) {
    this.dataItems = items;
    this.setRange(0);
}

SelectGrid.prototype.getDataForCurrentRange = function () {
    return this.dataItems.slice(this.currentRange.start, this.currentRange.end);
}

SelectGrid.prototype.getSelectedIndex = function () {
    if (this.specialSelection) return null;
    else return (this.columns * this.selectCaret.row) + this.selectCaret.column;
}

SelectGrid.prototype.getGridItemForSelection = function () {
    if (this.specialSelection) return this.specialItems[this.specialSelection];
    else return this.gridItems[this.getSelectedIndex()];
}

SelectGrid.prototype.getDataForSelection = function () {
    if (this.specialSelection) return null;
    var gridIdx = this.getSelectedIndex();
    return this.dataItems[this.currentRange.start + gridIdx];
}

SelectGrid.prototype.focus = function () {
    var ditem = this.getGridItemForSelection();
    if (ditem && ditem.interact) ditem.interact('select');
    this.hasFocus = true;
}

SelectGrid.prototype.blur = function () {
    var ditem = this.getGridItemForSelection();
    if (ditem && ditem.interact) ditem.interact('deselect');
    this.hasFocus = false;
}

/* THIS COMPROMISES THE PHILOSOPHICAL PURITY OF SELECTGRID!! :-| */
SelectGrid.prototype.setVisible = function (toggle) {
    for (var i=0; i<this.gridItems.length; i++) {
        var ditem = this.gridItems[i];
        if (ditem.distribute) {
            ditem.distribute(function (o) {o.hidden=!toggle;});
        }
        else {
            ditem.hidden = !toggle;
            
        }
    }
}

SelectGrid.prototype.setCaret = function (r, c) {
    r = r || 0;
    c = c || 0;
    this.selectCaret.row = r;
    this.selectCaret.column = c;
    var item = this.getSelectedItem();
    console.log(item);
    if (this.hasFocus && item.display && item.display.interact) item.display.interact('select');
}

SelectGrid.prototype.getItemForGridIndex = function (gridIdx) {
    // var disp, dat, isSpecial=false;
    // if (this.specialSelection) {
    //     isSpecial = true;
    //     disp = this.specialItems[this.specialSelection];
    // }
    // else {
    //     dat = this.dataItems[this.currentRange.start + gridIdx];
    //     disp = this.gridItems[gridIdx];
    // }
    return {
        data: this.dataItems[this.currentRange.start + gridIdx],
        display: this.gridItems[gridIdx]
    };
}

SelectGrid.prototype.getSelectedItem = function () {
    if (this.specialSelection) return {
        data: null,
        display: this.specialItems[this.specialSelection],
        isSpecial: true
    }
    else return this.getItemForGridIndex(this.getSelectedIndex());
}

SelectGrid.prototype.getDataIndexForGridIndex = function (gridIdx) {
    return this.currentRange.start + gridIdx;
}

SelectGrid.prototype.getPlacementForGridPosition = function (gridIdx) {
    // console.log(gridIdx);
    var grid = this;
    var row = Math.floor(gridIdx / grid.perRow);
    var idxInRow = gridIdx % grid.perRow;
    var itemAngle = (((Math.PI)/grid.perRow) * idxInRow);
    // gridItemAngle //
    return {
        location: { /* Ummmm this should be called "position" perhaps?? */
            x: grid.offset.x+(grid.ellipseScale.width * this.scale * Math.cos(itemAngle)),
            y: grid.offset.y+(row * grid.rowHeight),
            z: grid.offset.z+(grid.ellipseScale.depth*(this.scale * Math.sin(itemAngle))),
        },
        orientation: {
            x: 0,
            y: -1*itemAngle,
            z: 0
        }
    }
    
}

// SelectGrid.prototype.interactWithCurrentSelection = function (interaction) {
//
// }

SelectGrid.prototype.moveSelectCaret = function (direction) {

    /* Deselect current */
    var currentSelection;
    if (this.specialSelection) {
        currentSelection = this.specialItems[this.specialSelection];
    }
    else {
        currentSelection = this.gridItems[this.getSelectedIndex()];
    }
    if (currentSelection) currentSelection.interact('deselect');

    switch (direction) {
    case 'UP':
        this.selectCaret.row++;
        break;
    case 'DOWN':
        this.selectCaret.row--;
        break;
    case 'LEFT':
        this.selectCaret.column--;
        break;
    case 'RIGHT':
        this.selectCaret.column++;
        break;
    }
    
    
    
    /* Check bounds */
    this.specialSelection = null;
    if (this.selectCaret.row <= -1) this.selectCaret.row = 0;
    if (this.selectCaret.row >= this.rows) this.selectCaret.row = this.rows - 1;
    if (this.selectCaret.column < -1) this.selectCaret.column = -1;
    if (this.selectCaret.column > this.columns) this.selectCaret.column = this.columns;
    if (this.selectCaret.column == -1) this.specialSelection = 'PAGE_LEFT';
    if (this.selectCaret.column == this.columns) this.specialSelection = 'PAGE_RIGHT';
    
    /* Highlight new selection */
    var newSelection;
    if (this.specialSelection) {
        newSelection = this.specialItems[this.specialSelection];
    }
    else {
        newSelection = this.gridItems[this.getSelectedIndex()];
    }
    newSelection.interact('select');
    
}

