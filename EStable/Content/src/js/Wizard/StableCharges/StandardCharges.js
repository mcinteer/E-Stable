function createStandardChargesTable(data) {
    $('#tblStandardCharges').dynatable({
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

function deselectStandardCharge() {
    $(".pop-standard-charge").slideFadeToggle(function () {
        $("#addStandardCharge").removeClass("selected");
    });
}

$(function () {
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
});

$(function () {
    $('#submit-add-standard-charge').live('click', function () {
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
            error: function (data) {
                var test = '';
            }
        });
    });
});