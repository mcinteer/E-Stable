$(function () {
    $.fn.editable.defaults.mode = 'inline';

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
                url: function(record) {
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
                        success: function(data) {
                            dynatable.records.updateFromJson(data);
                            dynatable.settings.dataset.originalRecords = dynatable.settings.dataset.records;
                            dynatable.process();
                            dynatable.processingIndicator.hide();
                            $.fn.setupInputs(tableId, postUrl, selectOptions);
                        },
                        error: function(data) {
                        }
                    });
                }
            });
        }
    };
    
    $.fn.estableEditableRowWriter = function(rowIndex, record, columns, cellWriter) {
        var tr = '';

        // grab the record's attribute for each column
        for (var i = 0, len = columns.length; i < len; i++) {
            tr += cellWriter(columns[i], record);
        }

        return '<tr>' + tr + '</tr>';
    }

    ;

    $.fn.estableEditableCellWriter = function(column, record) {
        var html = column.attributeWriter(record),
            td = '<td';

        if (column.hidden || column.textAlign) {
            td += ' style="';

            // keep cells for hidden column headers hidden
            if (column.hidden) {
                td += 'display: none;';
            }

            // keep cells aligned as their column headers are aligned
            if (column.textAlign) {
                td += 'text-align: ' + column.textAlign + ';';
            }

            td += '"';
        }

        var val = html;

        if (column.inputType === 'select') {
            var options = $.selectOptions[column.id];
            var found = false;

            for (var i = 0; i < options.length && !found; i++) {
                if (options[i].value == val) {
                    val = options[i].text;
                    found = true;
                }
            }
        }

        html = '<a href="#" class="' + column.inputType + '" data-value="' + html + '" old-value="' + html + '" data-pk="' + record.Id + '" data-columnname="' + column.id + '" data-type="' + column.inputType + '" data-title="Select status">' + val + '</a>';

        return td + '>' + html + '</td>';
    };
    
    $.fn.htmlDecode = function(value) {
        if (value) {
            return $('<div />').html(value).text();
        } else {
            return '';
        }
    };
});