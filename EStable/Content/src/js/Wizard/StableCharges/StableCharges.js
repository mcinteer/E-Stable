var SITE = SITE || {};

SITE.fileInputs = function () {
    var $this = $(this),
        $val = $this.val(),
        valArray = $val.split('\\'),
        newVal = valArray[valArray.length - 1],
        $button = $this.siblings('.button'),
        $fakeFile = $this.siblings('.file-holder');
    if (newVal !== '') {
        $button.removeClass('btn-info');
        $button.addClass('btn-default');
        $('#confirmImportButton').removeClass('dont-display');
        $('#importStableChargeFilePath').val = newVal;
        if ($fakeFile.length === 0) {
            $button.after('<span class="file-holder">' + newVal + '</span>');
        } else {
            $fakeFile.text(newVal);
        }
    }
};

SITE.confirmImport = function() {
    var dynatable = $('#tblStableCharges').data('dynatable');

    dynatable.processingIndicator.hide();
    dynatable.processingIndicator.show();

    $.ajax({
        type: "POST",
        url: '../../../../../Wizard/ImportStableCharges',
        data: {
            path: $('#importStableChargeFilePath').val(),
            email: $('#email').val()
        },
        success: function(data) {
            dynatable.records.updateFromJson(data);
            dynatable.settings.dataset.originalRecords = dynatable.settings.dataset.records
            dynatable.process();
            dynatable.processingIndicator.hide();
        },
        error: function(data) {
        }
    });
};

$(document).ready(function () {
    $('.file-wrapper input[type=file]')
        .bind('change focus click', SITE.fileInputs);

    $('#confirmImportButton')
        .bind('click', SITE.confirmImport);
});

function createStableChargesTable(data) {
    $('#tblStableCharges').dynatable({
        dataset: {
            records: decode(data)
        },
        table: {
            defaultColumnIdStyle: 'asis'
        },
        inputs: {
            processingText: 'Fetching new Charges'
        }
    }); 
}

function deselectStableCharge() {
    $(".pop-stable-charge").slideFadeToggle(function () {
        $("#addStableCharge").removeClass("selected");
    });    
}

$(function() {
    $("#addStableCharge").live('click', function() {
        if($(this).hasClass("selected")) {
            deselectStableCharge();               
        } else {
            $(this).addClass("selected");
            $(".pop-stable-charge").slideFadeToggle(function() { 
                $("#stbl-unit").focus();
            });
        }
        return false;
    });

    $("#close-stable-charge").live('click', function () {
        deselectStableCharge();
        return false;
    });
});

$(function() {
    $('#submit-add-stable-charge').live('click', function() {
        var dynatable = $('#tblStableCharges').data('dynatable');

        dynatable.processingIndicator.hide();
        dynatable.processingIndicator.show();
        $.ajax({
            type: "POST",
            url: '../../../../../Wizard/SaveStableCharge',
            data: {
                unit : $('#stbl-unit').val(),
                instable: $('#instable').val(),
                description: $('#stbl-description').val(),
                rate: $('#stbl-rate').val(),
                email: $('#email').val()
            },
            success: function (data) {
                dynatable.records.updateFromJson(data);
                dynatable.settings.dataset.originalRecords = dynatable.settings.dataset.records
                dynatable.process();
                dynatable.processingIndicator.hide();
            },
            error : function(data) {
            }
        }); 
    });
});
