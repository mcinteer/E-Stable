$(function() {
    var standardCharges = {
        createStandardChargesTable: function(data) {
            $('#tblStandardCharges').dynatable({
                dataset: {
                    records: data
                },
                table: {
                    defaultColumnIdStyle: 'asis'
                },
                inputs: {
                    processingText: 'Fetching new Charges'
                },
                writers: {
                    _cellWriter: $.fn.estableEditableCellWriter,
                    _rowWriter: $.fn.estableEditableRowWriter
                }
            });
        },

        deselectStandardCharge: function() {
            $(".pop-standard-charge").slideFadeToggle(function() {
                $("#addStandardCharge").removeClass("selected");
            });
        }
    };
    
    function setupEventListeners() {
        $('#submit-add-standard-charge').live('click', function() {
            var dynatable = $('#tblStandardCharges').data('dynatable');

            dynatable.processingIndicator.hide();
            dynatable.processingIndicator.show();
            $.ajax({
                type: "POST",
                url: '../../../../../Wizard/SaveStandardCharge',
                data: {
                    description: $('#std-description').val(),
                    rate: $('#std-rate').val(),
                    email: $('#email').val()
                },
                success: function (data) {
                    dynatable.records.updateFromJson(data);
                    dynatable.settings.dataset.originalRecords = dynatable.settings.dataset.records
                    dynatable.process();
                    dynatable.processingIndicator.hide();
                },
                error: function(data) {
                    var test = '';
                }
            });
        });
        
        $("#addStandardCharge").live('click', function () {
            if ($(this).hasClass("selected")) {
                deselectStandardCharge();
            } else {
                $(this).addClass("selected");
                $(".pop-standard-charge").slideFadeToggle(function () {
                    $("#std-description").focus();
                });
            }
            return false;
        });

        $("#close-standard-charge").live('click', function () {
            standardCharges.deselectStandardCharge();
            return false;
        });
    }

    function setupStandardChargeInputs() {
        $.fn.setupInputs('#tblStandardCharges', '../../../../../Wizard/UpdateStandardCharge', {});
    }
    
    if (!$('#standardChargeData').length) {
        console.warn('You need to define your data Ryan!');
        return;
    }
    
    setupEventListeners();
    var standardChargeData = $.fn.htmlDecode($('#standardChargeData').html());
    standardCharges.createStandardChargesTable(JSON.parse(standardChargeData));
    setupStandardChargeInputs();
});
