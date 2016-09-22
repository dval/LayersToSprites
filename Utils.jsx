// buffer number with zeros 
function BufferWithZero (number, places) {
    var theNumberString = String(number);
    for (var o = 0; o < (places - String(number).length); o++) {
        theNumberString = String("0" + theNumberString)
    };

    return theNumberString
};

// does a deep search through all Layers to find a specific ID.
// returns a reference to the found layer or null.
function GetLayerByID(ii, container){
    // use document as default search level
    var p = (container=='undefined' || container == null)?app.activeDocument:container;
    // store the result
    var result = null; //assume we didn't find anything;
    // check all layers for the one we want
    for(var i=0; i<p.layers.length; i++){
         // store value once found
        if(p.layers[i].id == ii){
            result = p.layers[i];
            return result; 
        }
        // go deeper on layer sets
        if(p.layers[i].typename == "LayerSet"){
            //check next level of layers
            result = GetLayerByID(ii,p.layers[i]);
        }
        // break inner recursion if looking for ArtLayer
        if(result != null ) { return result; }
        
    }//endfor
    return result;
}

// does a deep search through all layers to find a specific name.
// returns the first layer with that name or null.
function GetLayerByName(lName, container){
    // use document as default search level
    var p = (container=='undefined' || container == null)?app.activeDocument:container;
    // store the result
    var result = null; //assume we didn't find anything;
    // check all layers for the one we want
    for(var i=0; i<p.layers.length; i++){
         // store value once found
        if(p.layers[i].name == lName){
            result = p.layers[i];
            return result; 
        }
        // go deeper on layer sets
        if(p.layers[i].typename == "LayerSet"){
            //check next level of layers
            result = GetLayerByName(lName,p.layers[i]);
        }
        // break inner recursion if looking for ArtLayer
        if(result != null ) { return result; }
        
    }//endfor
    return result;
}