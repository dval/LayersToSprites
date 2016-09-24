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

// focus on PS
app.bringToFront();

// debug level: 0-2 (0:disable, 1:break on error, 2:break at beginning)
$.level = 0;
//debugger; // launch debugger 

// store window result for feedback after window closes
var dlgResult = -1;

// Layer lists
// basically copying this archeture from the way Unity3D handles efficient object access.
// References are stored in lists to cut down on searching and itterative calls to the environment. Since
// the lists are just collections of pointers, their size is relatively inconsiquential compared to the whole
// application. 
var IDXLayers = new Array();
var IDXArtLayers = new Array();
var IDXLayerSets = new Array();
var IDXTopLayers = new Array();

// layers that were visible when the script was run.
var IDXVLayers = new Array();
var IDXVArtLayers = new Array();
var IDXVLayerSets = new Array();
var IDXVTopLayers = new Array();

// the heirarchal paths for each layer
var FolderPaths = new Array();


// the ** main body of the application. **
// it parses the DOM to find, sort, and store the document Layers. Then once the the data is usable, it
// builds a dialog box, and creates a selection list based on  the sorted lists, instead of the raw DOM,

//Only run if a file is open
if ( app.documents.length > 0 && app.activeDocument.name.substr(0,8) != 'Untitled' ) {
    
    $.writeln("Reading documnet: " + app.activeDocument.name );
    currentPath = "/";   

    // get our working document, we hold a reference to it, so we can switch back
    // from the document_copy. This way, if the user has multiple docs open, we 
    // return to the same doc we started in.
	var currentDoc = {};
        currentDoc.ref = app.activeDocument;
        currentDoc.name = app.activeDocument.name.match(/(.*)\.[^\.]+$/)[1];
        currentDoc.path = app.activeDocument.path;
        
    // collect layer data for document
    BuildLayerList(currentDoc.ref);
    // set our default display group
    currentDoc.groups = IDXLayers;
        
    // create  dialog;
    var dlg = BuildDialogBox();
    
} else  if( app.activeDocument ){
    // open doc, not saved yet.
    alert ("The documnet must be saved before running this script.");
} else {
    // no document is open
    alert ("There is no document open.");
}



// ** Support functions and logic **

// create all the necessary elements for displaying and selecting layers and export options.
// basically the entire UI for the app
function BuildDialogBox(){
    
	var dlg = new Window('dialog', "Export Sprites", [500,300,930,840],{resizeable: true});
	$.writeln("Building app window..." );
    
    // create list for layer-selection;
	dlg.layerRange = dlg.add('panel', [10,20,185,290], "Select LayerSets");
	dlg.layerRange.layersList = dlg.layerRange.add('listbox', [0,20,175,220], '', {multiselect: true});
    dlg.layerRange.showHidden = dlg.layerRange.add('checkbox', [10,225,160,245], "Show hidden layers ", { name: "chkShowHidden", value: true });
    dlg.layerRange.chkShowHidden.value = true;
    
    // add all layers, layersets selected by default
    dlg.layerManager = function(){
        dlg.layerRange.layersList.removeAll();
        for (var q = 0; q < currentDoc.groups.length; q++) {
            var lid = GetLayerByID(currentDoc.groups[q]) ;
            if( lid.visible || dlg.layerRange.chkShowHidden.value ){
                // have to store reference here, so we can set selected items at instantiation.
               var mitem = dlg.layerRange.layersList.add ("item",  lid.name);
                // select all LayerSets by default
                if(lid.typename == "LayerSet"){
                    // without the reference, the item is highlited, but the discrete listener is never invoked
                    // so, the item isn't really selected, and is treated as unselected during the export phase
                    mitem.selected = true;
                    // this doesn't work, ie. setting 'selected' without a ref
                    // dlg.layerRange.layersList.items[dlg.layerRange.layersList.items.length-1].selected = true;
                }//endif typename
            }//endif visible
        }//endfor
    }//end function
    dlg.layerManager ();
    
    // update list when option is set
    dlg.layerRange.chkShowHidden.onClick = function(){ dlg.layerManager(); };

    // Options for file names
    dlg.options = dlg.add('panel', [195,20,420,290], "Options:");
    // prefix 
    dlg.options.add('statictext', [11,20,46,40], "Prefix:", {multiline:false});
    dlg.options.prefixText = dlg.options.add('edittext', [54,20,165,40], "", {multiline:false});
    dlg.options.addFilename = dlg.options.add('checkbox', [11,45,205,65], "Include filename with prefix. ", {name:"chkFileName"});
    
    // layer merging and folder creation
    dlg.options.add('statictext', [11,75,165,95], "Folder Management: ", {multiline:false});
    dlg.options.allFolders = dlg.options.add('radiobutton', [11,100,205,120], "Folder for each LayerSet. ", {name:"rdoAllFolders"});
    dlg.options.noFolders = dlg.options.add('radiobutton', [11,125,205,145], "Don't create any folders. ", {name:"rdoNoFolders"});
    dlg.options.topLevel = dlg.options.add('radiobutton', [11,150,205,170], "Create only top level folders. ", {name:"rdoTopLevel"});
    dlg.options.allFolders.value=true;
    
    dlg.options.add('statictext', [11,180,165,200], "Layer Assembly: ", {multiline:false});
    dlg.options.bottomLevel = dlg.options.add('checkbox', [11,205,205,225], "Merge ArtLayers in each LayerSet. ", {name:"chkBottomLevel"});
    dlg.options.trimPixels = dlg.options.add('checkbox', [11,230,205,250], "Trim transparent pixels. ", {name:"chkFileName"});

    // select target-folder;
    dlg.target = dlg.add('panel', [10,305,420,425], "Export to:");
    dlg.target.targetSel = dlg.target.add('button', [18,20,100,40], "Select");
    dlg.target.targetField = dlg.target.add('edittext', [20,50,400,90], String(currentDoc.path), {multiline:true});
    dlg.target.targetSel.onClick = function () {
        var targetFolder = Folder.selectDialog("Select folder to export to:");
        dlg.target.targetField.text = targetFolder.fsName;
    };

    // ok- and cancel-buttons;
    // The docs state that buttons use the 'name' property as special identifiers of 'ok' or 'cancel'.
    // Stating they will be treated as special dialog buttons 'Submit' and 'Cancel' respectively. 
    // However, it's the 'text' property (button label) that is the special word. Changing the name
    // property has no effect. Changing the label from 'Ok' to 'Export' is enough to remove
    // the default click handler. 'Cancel' is then overriden by explicetly declaring an onClick handler.
    dlg.buildBtn = dlg.add('button', [220,460,410,475], "Export", {name:"ok"});
    dlg.cancelBtn = dlg.add('button', [21,460,210,475], "Cancel", {name:"cancel"});
    dlg.warning = dlg.add('statictext', [21,510,410,540], "Warning: Existing files will be replaced without prompting!", {multiline: true});
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
                // we need to pass the window reference to our export function explicetly.
                // because we reference ProcessExport() before we're done writing the window. 
                // or something like that.... it's the only spaghetti in the code.
                ProcessExport (dlg);
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

    // return a reference, so we can still use dialog options outside of dialog box
    return dlg;
    
}//endfunc


// our main export function
// this process the options in the dialog, creates necessary folder structure based on document hierarchy,
// then exports files for each artlayer into newly created folder structure.
function ProcessExport(dlg){
    
    // get selected layers
    var theLayerSelection = new Array();
    // store  layer references of selected layers
    
    for (var p = 0; p < dlg.layerRange.layersList.items.length; p++) {
        if (dlg.layerRange.layersList.items[p].selected == true) {
            theLayerSelection = theLayerSelection.concat(dlg.layerRange.layersList.items[p]);
        }
    };

    // collect dialog box options,
    var thePrefix = dlg.options.prefixText.text;
    var theDestination = dlg.target.targetField.text;

    // update the prefix if we have one
    if(dlg.options.chkFileName.value){
        thePrefix = currentDoc.name+thePrefix;
    }
    

    // for each layer in array;
    for (var m = theLayerSelection.length - 1; m >=0; m--) {
       
        // create a new document with same properties as the first
        var theCopy = app.documents.add( currentDoc.ref.width, currentDoc.ref.height, currentDoc.ref.resolution, currentDoc.name + "_copy.psd",  NewDocumentMode.RGB );
        
       // move to original document
        app.activeDocument = currentDoc.ref;
        
        // reference the layer
            $.writeln("Getting: " + theLayerSelection[m].text);
        var theLayer = GetLayerByName(theLayerSelection[m].text);
        
        // build filenames
        var tmpName = thePrefix+theLayer.name;
                    
        // transfer layerset over to the copy;
        theLayer.duplicate (theCopy, ElementPlacement.PLACEATBEGINNING);
        
        //switch back to  document_copy
        app.activeDocument = theCopy;
        
        // delete previously added layer;
       // theCopy.layers[1].remove();
        
        // check for trim options
        if(dlg.options.trimPixels.value){
            app.activeDocument.trim();
        }
         
       // build folder path from layer structure
       var myp = new Folder(dlg.target.targetField.text  + "/" + FolderPaths[theLayer.id] );
       myp.create();
       
        // use web export options for png files (pngOpts defined in external file.)
        activeDocument.exportDocument(
                File(dlg.target.targetField.text  + "/" + FolderPaths[theLayer.id] + "/" + theLayer.name +'.png'), 
                ExportType.SAVEFORWEB,
                pngOpts
        );
             
        // close the extranious document
        theCopy.close(SaveOptions.DONOTSAVECHANGES);   
    
    }//endfor

    
    // happy ending
    $.writeln("Export complete. " );
    dlg.close(1);
    
}//endfunc

// display layers to select for export
function BuildLayerList(container){
    
    // IDAllLayers, IDTopLayers, IDArtLayers, IDVisibleLayers, IDVisibleTopLayers, IDVisibleArtLayers;
    currentPath = (currentPath == 'undefined')?"/":currentPath;
    
    // store layer ID's for each set
    for (var m = container.layers.length - 1; m >= 0;m--) {
        
        var l = container.layers[m];

        // this line includes the layer groups;
        if(l.typename == "LayerSet" || l.typename == "ArtLayer" || l.typename == "TextLayer" ){
            IDXLayers = IDXLayers.concat(l.id);
            if(l.visible){
                IDXVLayers = IDXVLayers.concat(l.id);
            } //endif   
        }//endif
    
        // build list of topLevel layers
        if(l.parent == currentDoc.ref ){
            currentPath = "/";
            IDXTopLayers = IDXTopLayers.concat(l.id);
            if(l.visible){
                IDXVTopLayers = IDXVTopLayers.concat(l.id);
            }
        }
    
        // build list of ArtLayers and update list of AllLayers
        if (l.typename == "ArtLayer" || l.typename == "TextLayer") {
            IDXArtLayers = IDXArtLayers.concat(l.id);
            //currentPath  = "";
            if(l.visible){
                IDXVArtLayers = IDXVArtLayers.concat(l.id);
            }
        } 
    
        // this  calls an recursive loop which does a top-to-bottom depth first 
        // search of all groups in the document. 
        if(l.typename == "LayerSet" ){
            currentPath = currentPath + String( l.name + "/");
            BuildLayerList(l);
        }
        
        // store path for each layer
        $.writeln(l.id + ": " + currentPath);
        FolderPaths[l.id] = currentPath;
    
    }//endfor
}//endfunc

// return our result, (as a property...or an override...?) to ESTK ? or PS ? for ...logging?
// The ESTK console window prints "Result: undefined" after the script completes. By including
// this property as a function, I can hack in the actual result status of the script when it's done. So, 
// now  we get something pretty like:  "Result: Export successful."  Ta-Da!  Although, I have 
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
// so, we need to explicitly call the function to override the property?? what...

// feedback for user
alert(Result());

// feedback for debugger / machine
Result();
