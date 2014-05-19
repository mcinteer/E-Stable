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
                success: function(data) {
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
            deselectStandardCharge();
            return false;
        });
    }

    if (!$('#standardChargeData').length) {
        console.warn('You need to define your data Ryan!');
        return;
    }
    
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
    
    setupEventListeners();
    var standardChargeData = htmlDecode($('#standardChargeData').html());
    standardCharges.createStandardChargesTable(JSON.parse(standardChargeData));
});
