$(function() {

    function decode(encoded) {
        if (encoded == null) {
            return encoded;
        }
        var div = document.createElement('div');
        div.innerHTML = encoded;
        var test = div.firstChild.nodeValue;
        return JSON.parse(test);
    }

    $.fn.slideFadeToggle = function(easing, callback) {
        return this.animate({ opacity: 'toggle', height: 'toggle' }, "fast", easing, callback);
    };
    

});