
CARNIVAL.registerComponent('net.meta4vr.vrcomponents.xyzzy', function () {
    
    function Xyzzy() {
        console.log('Instanciating an xyzzy');
        this.x = 1;
    }
    
    Xyzzy.prototype.doAThing = function () {
        console.log(x);
    }
    
    return Xyzzy;
    
}());
