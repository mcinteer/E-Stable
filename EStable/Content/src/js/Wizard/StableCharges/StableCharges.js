$(function() {

    var stableCharges = {
        
        createStableChargesTable : function(data) {
            $('#tblStableCharges').dynatable({
                dataset: {
                    records: data
                },
                table: {
                    defaultColumnIdStyle: 'asis'
                },
                inputs: {
                    processingText: 'Fetching new Charges'
                }
            }); 
        },
        
        deselectStableCharge: function() {
            $(".pop-stable-charge").slideFadeToggle(function () {
                $("#addStableCharge").removeClass("selected");
            });    
        }
        
    };

    function htmlEncode(value) {
        if (value) {
            return jQuery('<div />').text(value).html();
        } else {
            return '';
        }
    }

    function htmlDecode(value) {
        if (value) {
            return $('<div />').html(value).text();
        } else {
            return '';
        }
    }

    function setupEventListeners() {
        $("#addStableCharge").live('click', function () {
            if ($(this).hasClass("selected")) {
                stableCharges.deselectStableCharge();
            } else {
                $(this).addClass("selected");
                $(".pop-stable-charge").slideFadeToggle(function () {
                    $("#stbl-unit").focus();
                });
            }
            return false;
        });
        
        $("#close-stable-charge").live('click', function () {
            stableCharges.deselectStableCharge();
            return false;
        });

        $('#submit-add-stable-charge').live('click', function () {
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
                success: function (data) {
                    dynatable.records.updateFromJson(data);
                    dynatable.settings.dataset.originalRecords = dynatable.settings.dataset.records
                    dynatable.process();
                    dynatable.processingIndicator.hide();
                },
                error: function (data) {
                }
            });
        });
    }
    
    if (!$('#stableChargeData').length) {
        console.warn('You need to define your data Ryan!');
        return;
    }

    setupEventListeners();
    var stableChargeData = htmlDecode($('#stableChargeData').html());
    stableCharges.createStableChargesTable(JSON.parse(stableChargeData));
});