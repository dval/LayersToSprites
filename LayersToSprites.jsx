/*
* This script exports layers to images/sprites with a folder hierachy that matches the LayerSets in the document.
* The primary goal is to create folders for each layer set and publish specified image type into created folders.
* This was created to help with the  Photoshop >  SpriterPro > TexturePacker > Unity3D in 2D workflow.
* 
* Using this script should allow you to publish your PS characters/puppets directly into your Spriter project folder.
* (you can skip the layout step and just use the individual sprites in Spriter.)
* Then, let TexturePacker handler the spritesheet creation when importing into Unity.
*
*/

// Script needs to run from in the PS environment
#target photoshop

// Filetype options { psdOpts, pdfOpts, jpgOpts, pngOpts, tiffOpts, tgaOpts }
#include "L2SExportTypes.jsx"
#include "Utils.jsx"

// seemingly useless line, since we need to be in PS to run script...
app.bringToFront();

// debug level: 0-2 (0:disable, 1:break on error, 2:break at beginning)
$.level = 1;
//debugger; // launch debugger 

// store window result
var dlgResult = -1;

//Only run if a file is open
if ( app.documents.length > 0 && app.activeDocument.name.substr(0,8) != 'Untitled' ) {
    
    $.writeln("Reading documnet: " + app.activeDocument.name );
    
    // get active document
	var currentDoc = {};
        currentDoc.ref = app.activeDocument;
        currentDoc.name = app.activeDocument.name.match(/(.*)\.[^\.]+$/)[1];
        
        currentDoc.path = app.activeDocument.path;
        currentDoc.groups = CollectLayerSets(app.activeDocument);
        
    // create  dialog;	
	var dlg = new Window('dialog', "Export Sprites", [500,300,930,840],{resizeable: true});
	$.writeln("Building app window..." );
    // create list for layer-selection;
	dlg.layerRange = dlg.add('panel', [21,20,179,375], "Select LayserSets to export:");
	dlg.layerRange.layersList = dlg.layerRange.add('listbox', [11,20,160,305], '', {multiselect: true});
    
    /// don't add hidden layers / add hidden layers logic should go here, with update based on checkbox listener.
    

    dlg.layerRange.showHidden = dlg.layerRange.add('checkbox', [11,315,160,335], "Show hidden layers ", { name: "chkShowHidden", value: true });
    dlg.layerRange.chkShowHidden.value = true;
    // add all layers selected by default
    dlg.layerManager = function(){
        dlg.layerRange.layersList.removeAll();
        for (var q = 0; q < currentDoc.groups.length; q++) {
            if( currentDoc.groups[q].visible || dlg.layerRange.chkShowHidden.value ){
                dlg.layerRange.layersList.add ("item", currentDoc.groups[q].name);
                dlg.layerRange.layersList.items[dlg.layerRange.layersList.items.length-1].selected = true;
            }
        }
    }
    dlg.layerManager ();
    
    // update list when option is set
    dlg.layerRange.chkShowHidden.onClick = function(){ dlg.layerManager(); };

    // Options for file names
    dlg.options = dlg.add('panel', [220,20,410,205], "Options:");
    // prefix 
    dlg.options.add('statictext', [11,20,46,40], "Prefix:", {multiline:false});
    dlg.options.prefixText = dlg.options.add('edittext', [54,20,145,40], "", {multiline:false});
    // layer merging and folder creation
    dlg.options.topLevel = dlg.options.add('checkbox', [11,60,205,80], "Create only top level folders ", {name:"chkTopLevel"});
    dlg.options.bottomLevel = dlg.options.add('checkbox', [11,85,205,105], "Merge bottom level items ", {name:"chkBottomLevel"});
    dlg.options.addFilename = dlg.options.add('checkbox', [11,110,205,130], "Include filename in prefix ", {name:"chkFileName"});
    dlg.options.trimPixels = dlg.options.add('checkbox', [11,135,205,155], "Trim transparent pixels ", {name:"chkFileName"});

    // select target-folder;
    dlg.target = dlg.add('panel', [220,215,410,445], "Export to:");
    dlg.target.targetSel = dlg.target.add('button', [11,20,100,40], "Select");
    dlg.target.targetField = dlg.target.add('edittext', [11,50,100,155], String(currentDoc.path), {multiline:true});
    dlg.target.targetSel.onClick = function () {
        var target = Folder.selectDialog("Select folder to export to:");
        dlg.target.targetField.text = target.fsName
    };

    // ok- and cancel-buttons;
    // The docs state that buttons use the 'name' property as special identifiers of 'ok' or 'cancel'.
    // Stating they will be treated as special dialog buttons 'Submit' and 'Cancel' respectively. 
    // However, it's the 'text' property (button label) that is the special word. Changing the name
    // property has no effect. Changing the label from 'Ok' to 'Export' is enough to remove
    // the default click handler. 'Cancel' is then overriden by explicetly declaring an onClick handler.
    dlg.buildBtn = dlg.add('button', [220,460,410,475], "Export", {name:"ok"});
    dlg.cancelBtn = dlg.add('button', [21,460,210,475], "Cancel", {name:"cancel"});
    dlg.warning = dlg.add('statictext', [21,490,410,530], "Warning: Existing files will be replaced without prompting!", {multiline: true});
    // add custom  button click handlers , overriding default 
    dlg.buildBtn.onClick = function () { dlg.onBeforeClose(true); };
    dlg.cancelBtn.onClick = function () { dlg.onBeforeClose(false); };

    // center the dialog on the active screen
    dlg.center();
    $.writeln("Waiting for input... " );
    
    //Button handler catches click and does a pre-flight check
    dlg.onBeforeClose = function(hasJob){
        $.writeln("Job waiting: "+hasJob );
        // if we hit the enter button...
        if(hasJob){
            //make sure there are layers selected to export
            if( dlg.layerRange.layersList.selection == null ||  dlg.layerRange.layersList.selection.length <1 ){
                 alert("You're doing it wrong.\n\nYou need to select at least 1 layer.","No");
                 // returning false, cancels the export, but leaves the window open for layer selection.
                return false;
            }else{
                $.writeln("Starting job... " );
                ProcessExport ();
            }//endif
        } else { // else we hit the cancel button
            dlg.close(2);
        }//endif
        
        return true; //why not...
    }//endfunction

    // tidy up the closing
    // contrary to the docs, onClose is not called before the window is closed. It is called
    // after the window is closed. Returning 'false' from this callback does not prevent the 
    // window closing as docs suggest. It may not need a return value at all.
    dlg.onClose = function(){
        $.writeln("Window closed." );
        return dlgResult;
    }

    // ?? not sure why we store this. dlgResult does not get set until close() is called.
    // ie. it is the result of the 'completed' window life cycle. Only after the window is
    // closed can we use dlgResult to check for the button that was pushed. That's it. 
    // No window vars will  be available. In this case, it is being used as an exit status.
    dlgResult = dlg.show ();
    $.writeln("Job submit status: "+dlgResult );

} else  if( app.activeDocument ){
    // open doc, not saved yet.
    alert ("The documnet must be saved before running this script.");
} else {
    // no document is open
    alert ("There is no document open.");
}

// our main export function
function ProcessExport(){
    
    // get selected layers
    var theLayerSelection = new Array;
    var theColl = dlg.layerRange.layersList.items;
    for (var p = 0; p < dlg.layerRange.layersList.items.length; p++) {
        if (dlg.layerRange.layersList.items[p].selected == true) {
            theLayerSelection = theLayerSelection.concat(p);
        }
    };

    // collect the rest of the variables,
    var thePrefix = dlg.options.prefixText.text;
    //var theNumber = Number (dlg.number.startNumber.text) - 1;
    //var theLayerNameAdd = dlg.layerName.doAddName.value;
    //var theNumbering = dlg.number.addNumber.value;
    var theDestination = dlg.target.targetField.text;

    // create a  copy;
    // var theCopy = currentDoc.ref.duplicate( currentDoc.name + "_copy.psd" ,  false );
    // create a new document with same properties as the first
    var theCopy = app.documents.add( currentDoc.ref.width, currentDoc.ref.height, currentDoc.ref.resolution, currentDoc.name + "_copy.psd",  NewDocumentMode.RGB );
    
    // for each layer in array;
    for (var m = theLayerSelection.length - 1; m >=0; m--) {
        
        // move to original document
        app.activeDocument = currentDoc.ref;
    
        // reference the layer
        var theLayer = currentDoc.groups[theLayerSelection[m]];
        
        // build filenames
        var tmpName = dlg.options.prefixText.text+theLayer.name.replace("/", "_");
                    
        // transfer layerset over to the copy;
        theLayer.duplicate (theCopy, ElementPlacement.PLACEATBEGINNING);
        
        //switch to new document
        app.activeDocument = theCopy;
        
        // delete last added layer;
        theCopy.layers[1].remove();
        
        // check for trim options
        if(dlg.options.trimPixels.value){
            app.activeDocument.trim();
        }
        
        // use web export options for png files (pngOpts defined in external file.)
        activeDocument.exportDocument(File(dlg.target.targetField.text  + "/" + theLayer.name +'.png'),ExportType.SAVEFORWEB, pngOpts);
        
    }//endfor

    theCopy.close(SaveOptions.DONOTSAVECHANGES);

    $.writeln("Export complete. " );
    dlg.close(1);
    
}

// display layers to select for export
function BuildLayerList(){
                
}

// returns selected layers to export
function CollectLayerSets (theParent) {

    var allLayerSets = new Array();
    
    for (var m = theParent.layers.length - 1; m >= 0;m--) {
        var theLayer = theParent.layers[m];
        // apply the function to layersets;
        if (theLayer.typename == "ArtLayer") {
        //	allLayerSets = allLayerSets.concat(theLayer);
        } else {
            // this line includes the layer groups;
            allLayerSets = allLayerSets.concat(theLayer);
            allLayerSets = allLayerSets.concat(CollectLayerSets(theLayer));
        }
    }

    return allLayerSets;
}

// return our result, (as a property...or an override...?) to ESTK ? or PS ? for ...logging?
// The ESTK console window prints "Result: undefined" after the script completes. By including
// this property as a function, I can hack in the actual result status of the script when it's done. So, 
// instead we get something pretty like:  "Result: Export successful."  Ta-Da!  Although, I have 
// no idea if PS ever sees this message.
var Result = function(){
    var resultMsg = "";
    switch(dlgResult){
        case  -1:
            resultMsg = "Error. Status not set.";
            break;
        case  0:
            resultMsg = "Error. Status unknown.";
            break;
        case 1:
            resultMsg = "Export successful.";
            break;
        case 2:
            resultMsg = "Canceled by user.";
    }
    return resultMsg;
}

Result();
