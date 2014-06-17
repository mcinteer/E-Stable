$(function() {
    var selectOptions = {
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
                    _cellWriter: estableEditableCellWriter,
                    _rowWriter: estableEditableRowWriter
                }
            });
        },

        deselectStableCharge: function() {
            $(".pop-stable-charge").slideFadeToggle(function() {
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

    function estableEditableRowWriter(rowIndex, record, columns, cellWriter) {
        var tr = '';

        // grab the record's attribute for each column
        for (var i = 0, len = columns.length; i < len; i++) {
            tr += cellWriter(columns[i], record);
        }

        return '<tr>' + tr + '</tr>';
    }

    ;

    function estableEditableCellWriter(column, record) {
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
            var options = selectOptions[column.id];
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
    var stableChargeData = htmlDecode($('#stableChargeData').html());
    stableCharges.createStableChargesTable(JSON.parse(stableChargeData));
    $.fn.editable.defaults.mode = 'inline';
    setupStableChargeInputs();
});