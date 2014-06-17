$(function() {

    function decode(encoded) {
        if (encoded == null) {
            return encoded;
        }
        var div = document.createElement('div');
        div.innerHTML = encoded;
        var test = div.firstChild.nodeValue;
        return JSON.parse(test);
    }

    $.fn.slideFadeToggle = function(easing, callback) {
        return this.animate({ opacity: 'toggle', height: 'toggle' }, "fast", easing, callback);
    };
    
    $.fn.setupInputs = function(tableId, postUrl, selectOptions) {

        tableId = tableId || '#tblStableCharges';
        postUrl = postUrl || '../../../../../Wizard/SaveStableChargeInStableValue';

        $(tableId + ' th').each(function(index, th) {
            addEditableInput(this.getAttribute('inputtype'), this.getAttribute('data-dynatable-column'));
        });
        
        function addEditableInput(inputType, columnName) {

            $(tableId + ' *[data-columnname="' + columnName + '"]').editable({
                name: columnName,
                type: inputType,
                source: selectOptions[columnName],
                url: function (record) {
                    var dynatable = $(tableId).data('dynatable');

                    dynatable.processingIndicator.hide();
                    dynatable.processingIndicator.show();
                    
                    $.ajax({
                        type: "POST",
                        url: postUrl,
                        data: {
                            id: record.pk,
                            columnName: columnName,
                            email: $('#email').val(),
                            updatedValue: record.value
                        },
                        success: function (data) {
                            dynatable.records.updateFromJson(data);
                            dynatable.settings.dataset.originalRecords = dynatable.settings.dataset.records;
                            dynatable.process();
                            dynatable.processingIndicator.hide();
                            $.fn.setupInputs(tableId, postUrl, selectOptions);
                        },
                        error: function (data) {
                        }
                    });
                }
            });
        }
    }
});