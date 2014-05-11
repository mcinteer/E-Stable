function createAnimalTable(data) {
    $('#tblAnimal').dynatable({
        dataset: {
            records: decode(data)
        },
        table: {
            defaultColumnIdStyle: 'stripSpaces'
        },
        inputs: {
            processingText: 'Fetching new Animals'
        }
    });
}


function deselectAnimal() {
    $(".pop-animal").slideFadeToggle(function () {
        $("#addanimal").removeClass("selected");
    });
}

$(function () {
    $("#addAnimal").live('click', function () {
        if ($(this).hasClass("selected")) {
            deselectAnimal();
        } else {
            $(this).addClass("selected");
            $(".pop-animal").slideFadeToggle(function () {
                $("#racingName").focus();
            });
        }
        return false;
    });

    $("#close-animal").live('click', function () {
        deselectAnimal();
        return false;
    });
});

$(function () {
    $('#submit-add-animal').live('click', function () {
        var dynatable = $('#tblAnimal').data('dynatable');

        dynatable.processingIndicator.hide();
        dynatable.processingIndicator.show();
        $.ajax({
            type: "POST",
            url: '../../../../../Wizard/SaveAnimal',
            data: {
                racingName: $('#racingName').val(),
                stableName: $('#stableName').val(),
                sire: $('#sire').val(),
                dam: $('#dam').val(),
                gender: $('#gender').val(),
                dateOfBirth: $('#dateOfBirth').val(),
                colour: $('#colour').val(),
                markings: $('#markings').val(),
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