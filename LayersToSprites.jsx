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

#target photoshop

// seemingly useless line, since we need to be in PS to run script...
app.bringToFront();

// debug level: 0-2 (0:disable, 1:break on error, 2:break at beginning)
 $.level = 1;
 //debugger; // launch debugger on next line

//Only run if a file is open
if ( app.documents.length > 0 && app.activeDocument.name.substr(0,8) != 'Untitled' ) {
    
    // get active document
	var currentDoc = {};
        currentDoc.ref = app.activeDocument;
        currentDoc.name = app.activeDocument.name.match(/(.*)\.[^\.]+$/)[1];
        currentDoc.path = app.activeDocument.path;
        currentDoc.groups = collectLayerSets(app.activeDocument);
        
    // filter for checking if entry is numeric, thanks to xbytor //
	numberKeystrokeFilter = function() {
        this.text = this.text.replace(",", "");
        this.text = this.text.replace(".", "");
        if (this.text.match(/[^\-\.\d]/)) {
            this.text = this.text.replace(/[^\-\.\d]/g, "");
        };
        if (this.text == "") {
            this.text = "0"
        }
	};

    // create  dialog;	
	var dlg = new Window('dialog', "Export Sprites", [500,300,930,840],{resizeable: true});
	
    // create list for layer-selection;
	dlg.layerRange = dlg.add('panel', [21,20,179,375], "Select LayserSets to export:");
	dlg.layerRange.layersList = dlg.layerRange.add('listbox', [11,20,160,305], '', {multiselect: true});
    // add all layers selected by default
	for (var q = 0; q < currentDoc.groups.length; q++) {
		dlg.layerRange.layersList.add ("item", currentDoc.groups[q].name);
		dlg.layerRange.layersList.items[q].selected = true
	};

    dlg.layerRange.showHidden = dlg.layerRange.add('checkbox', [11,315,160,335], "Show hidden layers ", { name: "chkShowHidden", value: true });
    dlg.layerRange.chkShowHidden.value = true;

    // entry for prefix;
    dlg.prefix = dlg.add('panel', [220,20,410,185], "Naming:");

    dlg.prefix.add('statictext', [11,20,46,40], "Prefix:", {multiline:false});
    dlg.prefix.prefixText = dlg.prefix.add('edittext', [54,20,145,40], "", {multiline:false});

    dlg.prefix.topLevel = dlg.prefix.add('checkbox', [11,60,205,80], "Create only top level folders ", {name:"chkTopLevel"});
    dlg.prefix.bottomLevel = dlg.prefix.add('checkbox', [11,85,205,105], "Merge bottom level items ", {name:"chkBottomLevel"});
    dlg.prefix.addFilename = dlg.prefix.add('checkbox', [11,110,205,130], "Include filename in prefix ", {name:"chkFileName"});

    // field to select target-folder;
    dlg.target = dlg.add('panel', [290,285,410,445], "Export to:");
    dlg.target.targetSel = dlg.target.add('button', [11,20,100,40], "Select");
    dlg.target.targetField = dlg.target.add('statictext', [11,50,100,155], String(currentDoc.path), {multiline:true});
    dlg.target.targetSel.onClick = function () {
    var target = Folder.selectDialog("Select folder to export to:");
        dlg.target.targetField.text = target.fsName
    };

    // ok- and cancel-buttons;
    dlg.buildBtn = dlg.add('button', [220,460,410,475], "Export", {name:"xnlse"});
    dlg.cancelBtn = dlg.add('button', [21,460,210,475], "Cancelsss", {name:"rescx"});
    dlg.warning = dlg.add('statictext', [21,490,410,530], "Warning: Existing files will be replaced without prompting!", {multiline: true});

    dlg.center();

    //dlg.buildBtn.addEventListener('click ', function () { this.parent.close(2); });
    dlg.buildBtn.onClick = function () { dlg.dClose(true); };
    //dlg.buildBtn.OnClick = function () { this.parent.close(2); };
    //dlg.cancelBtn.addEventListener('click ', function () { this.parent.close(1); });
    dlg.cancelBtn.onClick = function () { this.parent.close(true); };

    //buildBtn.onClick = function(){
    dlg.dClose = function(ivar){
        
        $.writeln(dlg.layerRange.layersList.selection);
        if( dlg.layerRange.layersList.selection == null ||  dlg.layerRange.layersList.selection.length <1 ){
             
            return false;
        }else{
            dlg.close(true); 
        }

    }

    // final check before we run script
    var submitJob = dlg.show ();

} else  if( app.activeDocument ){
    alert ("The documnet must be saved before running this script.");
} else {
    alert ("There is no document open.");
}


// buffer number with zeros 
function bufferNumberWithZeros (number, places) {
    var theNumberString = String(number);
    for (var o = 0; o < (places - String(number).length); o++) {
        theNumberString = String("0" + theNumberString)
    };

    return theNumberString
};

function ProcessExport(){

    // Handle any 'is OK to .show() dialog?' issues 
    if (submitJob == true) {

         
    
        // get the number instead of the name;	
        var theLayerSelection = new Array;
        var theColl = dlg.layerRange.layersList.items;
        for (var p = 0; p < dlg.layerRange.layersList.items.length; p++) {
            if (dlg.layerRange.layersList.items[p].selected == true) {
                theLayerSelection = theLayerSelection.concat(p);
            }
        };

        // collect the rest of the variables,
        var thePrefix = dlg.prefix.prefixText.text;
        //var theNumber = Number (dlg.number.startNumber.text) - 1;
        //var theLayerNameAdd = dlg.layerName.doAddName.value;
        var theDestination = dlg.target.targetField.text;
        //var theNumbering = dlg.number.addNumber.value;

        // pdf options	
        pdfOpts = new PDFSaveOptions() ;
        pdfOpts.embedColorProfile = true;
        pdfOpts.PDFCompatibility =  PDFCompatibility.PDF13;
        pdfOpts.downSample =  PDFResample.NONE;
        pdfOpts.vectorData = true;
        pdfOpts.alphaChannels = false;
        pdfOpts.byteOrder = ByteOrder.MACOS; 
        pdfOpts.layers = false ;
        pdfOpts.preserveEditing = false ;
        pdfOpts.convertToEightBit = true;
        pdfOpts.annotations = false;
        pdfOpts.colorConversion = false;
        pdfOpts.embedFonts = true;
        pdfOpts.embedThumbnail = true;
        pdfOpts.transparency = false;
        pdfOpts.encoding = PDFEncoding.PDFZIP ;	
        var theVisibilities = new Array;

        // jpg options
        var jpgopts = new JPEGSaveOptions();
        jpgopts.byteOrder = ByteOrder.MACOS;
        jpgopts.embedColorProfile = true;
        jpgopts.formatOptions = FormatOptions.STANDARDBASELINE;
        jpgopts.matte = MatteType.NONE;
        jpgopts.quality = 10;
        
        var pngOpts = new ExportOptionsSaveForWeb; 
        pngOpts.format = SaveDocumentType.PNG
        pngOpts.PNG8 = false; 
        pngOpts.transparency = true; 
        pngOpts.interlaced = false; 
        pngOpts.quality = 100;
        
        // create the file name;
        var fileNamePrefix = "";
        if (thePrefix.length > 0) {
            fileNamePrefix = thePrefix+"_";
        }
    
        // create a flattened copy;
        //var theCopy = myDocument.duplicate("thecopy", true);
        
        // do the operation;
        for (var m = theLayerSelection.length - 1; m >=0; m--) {
            
            //app.activeDocument = myDocument;
            
            var theLayer = theLayerSets[theLayerSelection[m]];
            //var aLayerName = "_" + theLayer.name.replace("/", "_");
            			
            // transfer layerset over to the copy;
            theLayer.duplicate (theCopy, ElementPlacement.PLACEATBEGINNING);
            //app.activeDocument = theCopy;
            // hide the llast added layer;
            //theCopy.layers[1].visible = false;
            //theCopy.saveAs((new File(theDestination+"/"+myDocName+aSuffix+aLayerName+theNumberString+".pdf")),pdfOpts,true)
           // theCopy.saveAs((new File(theDestination+"/"+aSuffix+aLayerName+theNumberString+".jpg")),jpgopts,true);
           //activeDocument.exportDocument(new File(saveFile),ExportType.SAVEFORWEB,pngOpts); 
            
        }//endfor
    
        //theCopy.close(SaveOptions.DONOTSAVECHANGES);

    }//endif
}

// collect all layersets 
function collectLayerSets (theParent) {

    var allLayerSets = new Array();
    
    for (var m = theParent.layers.length - 1; m >= 0;m--) {
        var theLayer = theParent.layers[m];
        // apply the function to layersets;
        if (theLayer.typename == "ArtLayer") {
        //	allLayerSets = allLayerSets.concat(theLayer)
        }
        else {
        // this line includes the layer groups;
        allLayerSets = allLayerSets.concat(theLayer);
        allLayerSets = allLayerSets.concat(collectLayerSets(theLayer))
        }
    }

    return allLayerSets;
}
