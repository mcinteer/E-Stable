function createOwnerTable(data, tableID) {
    $('#tbl-'+tableID).dynatable({
        dataset: {
            records: decode(data)
        },
        table: {
            defaultColumnIdStyle: 'stripSpaces'
        },
        inputs: {
            processingText: 'Fetching new Owners'
        }
    });
}

function deselectOwner(tableID) {
    $(".pop-owner-"+ tableID).slideFadeToggle(function () {
        $("#addOwner-"+tableID).removeClass("selected");
    });
}

function setupAddOwnerClickEvent(tableID) {
    $("#addOwner-"+tableID).live('click', function () {
        if ($(this).hasClass("selected")) {
            deselectOwner(tableID);
        } else {
            $(this).addClass("selected");
            $(".pop-owner-"+tableID).slideFadeToggle(function () {
                $("#animalName-"+tableID).focus();
            });
        }
        return false;
    });

    $(".close-owner-"+tableID).live('click', function () {
        deselectOwner(tableID);
        return false;
    });
}

function setupClickEvents(tableID) {
    setupAddOwnerClickEvent(tableID);
    setupSubmitAddOwnerClickEvent(tableID);
}

function setupSubmitAddOwnerClickEvent(tableID) {
    $('#submit-add-owner-' + tableID).live('click', function () {
        var dynatable = $('#tbl-' + tableID).data('dynatable');

        dynatable.processingIndicator.hide();
        dynatable.processingIndicator.show();
        $.ajax({
            type: "POST",
            url: '../../../../../Wizard/SaveOwner',
            data: {
                animalName: $('#animal-name-'+ tableID).val(),
                owner: $('#ownerName-' + tableID).val(),
                percentOwned: $('#percentOwned-' + tableID).val(),
                invoiced: $('#invoiced-' + tableID).val(),
                ownerEmail: $('#ownerEmail-' + tableID).val(),
                syndicate: $('#syndicate-' + tableID).val(),
                syndicateName: $('#syndicateName-' + tableID).val(),
                dayPhone: $('#dayPhone-' + tableID).val(),
                nightPhone: $('#nightPhone-' + tableID).val(),
                mobilePhone: $('#mobilePhone-' + tableID).val(),
                address: $('#address-' + tableID).val(),
                stableEmail: $('#email').val()

            },
            success: function (data) {
                dynatable.records.updateFromJson(data);
                dynatable.settings.dataset.originalRecords = dynatable.settings.dataset.records;
                dynatable.process();
                dynatable.processingIndicator.hide();
            },
            error: function (data) {
                var test = '';
            }
        });
    });
}