$(function() {
    $.selectOptions = selectOptions = {
        'Unit': [
            { value: 'Daily', text: 'Daily' },
            { value: 'Weekly', text: 'Weekly' },
            { value: 'Monthly', text: 'Monthly' },
            { value: 'Yearly', text: 'Yearly' }
        ],
        'InStable': [
            { value: true, text: 'Yes' },
            { value: false, text: 'No' }
        ]
    };
    
    var stableCharges = {        
        createStableChargesTable: function(data) {
            $('#tblStableCharges').dynatable({
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

        deselectStableCharge: function() {
            $(".pop-stable-charge").slideFadeToggle(function() {
                $("#addStableCharge").removeClass("selected");
            });
        }        
    };
    
    function setupEventListeners() {
        $("#addStableCharge").live('click', function() {
            if ($(this).hasClass("selected")) {
                stableCharges.deselectStableCharge();
            } else {
                $(this).addClass("selected");
                $(".pop-stable-charge").slideFadeToggle(function() {
                    $("#stbl-unit").focus();
                });
            }
            return false;
        });

        $("#close-stable-charge").live('click', function() {
            stableCharges.deselectStableCharge();
            return false;
        });

        $('#submit-add-stable-charge').live('click', function() {
            var dynatable = $('#tblStableCharges').data('dynatable');

            dynatable.processingIndicator.hide();
            dynatable.processingIndicator.show();
            $.ajax({
                type: "POST",
                url: '../../../../../Wizard/SaveStableCharge',
                data: {
                    unit: $('#stbl-unit').val(),
                    instable: $('#instable').val(),
                    description: $('#stbl-description').val(),
                    rate: $('#stbl-rate').val(),
                    email: $('#email').val()
                },
                success: function(data) {
                    dynatable.records.updateFromJson(data);
                    dynatable.settings.dataset.originalRecords = dynatable.settings.dataset.records;
                    dynatable.process();
                    dynatable.processingIndicator.hide();
                    $.fn.setupInputs('#tblStableCharges', '../../../../../Wizard/UpdateStableCharge', selectOptions);
                },
                error: function(data) {
                }
            });
        });
    }

    function setupStableChargeInputs() {
        $.fn.setupInputs('#tblStableCharges', '../../../../../Wizard/UpdateStableCharge', selectOptions);
    }
    
    if (!$('#stableChargeData').length) {
        console.warn('You need to define your data Ryan!');
        return;
    }
    
    $.fn.slideFadeToggle = function (easing, callback) {
        return this.animate({ opacity: 'toggle', height: 'toggle' }, "fast", easing, callback);
    };

    setupEventListeners();
    var stableChargeData = $.fn.htmlDecode($('#stableChargeData').html());
    stableCharges.createStableChargesTable(JSON.parse(stableChargeData));
    setupStableChargeInputs();
});