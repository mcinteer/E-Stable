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
                },
                writers: {
                    _cellWriter: estableEditableCellWriter,
                    _rowWriter: estableEditableRowWriter
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
                    dynatable.settings.dataset.originalRecords = dynatable.settings.dataset.records;
                    dynatable.process();
                    dynatable.processingIndicator.hide();
                    setupInputs();
                },
                error: function (data) {
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
    };

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
        
        html = '<a href="#" class="' + column.inputType + '" old-value="' + html + '" data-pk="' + record.Id + '" data-type="select" data-title="Select status">' + html + '</a>';

        return td + '>' + html + '</td>';
    }

    function setupInputs() {
        setupUnitInputs();
        setupInStableInputs();
    }

    function setupInStableInputs() {
        $('#tblStableCharges .radio').editable({
            name: 'instable',
            type: 'select',
            source: [
                { value: 'yes', text: 'Yes' },
                { value: 'no', text: 'No' }
            ],
            url: function (record) {
                var dynatable = $('#tblStableCharges').data('dynatable');

                dynatable.processingIndicator.hide();
                dynatable.processingIndicator.show();

                $.ajax({
                    type: "POST",
                    url: '../../../../../Wizard/SaveStableChargeInStableValue',
                    data: {
                        instable: record.value,
                        id: record.pk,
                        email: $('#email').val()
                    },
                    success: function (data) {
                        dynatable.records.updateFromJson(data);
                        dynatable.settings.dataset.originalRecords = dynatable.settings.dataset.records;
                        dynatable.process();
                        dynatable.processingIndicator.hide();
                        setupInputs();
                    },
                    error: function (data) {
                    }
                });
            }
        });
    }
    

    function setupUnitInputs() {
        $('#tblStableCharges .select').editable({
            name: 'unit',
            type: 'select',
            source: [
                { value: 'Daily', text: 'Daily' },
                { value: 'Weekly', text: 'Weekly' },
                { value: 'Monthly', text: 'Monthly' },
                { value: 'Yearly', text: 'Yearly' }
            ],
            url: function (record) {
                var dynatable = $('#tblStableCharges').data('dynatable');

                dynatable.processingIndicator.hide();
                dynatable.processingIndicator.show();
                
                $.ajax({
                    type: "POST",
                    url: '../../../../../Wizard/SaveStableChargeUnitAmount',
                    data: {
                        unit: record.value,
                        id: record.pk,
                        email: $('#email').val()
                    },
                    success: function (data) {
                        dynatable.records.updateFromJson(data);
                        dynatable.settings.dataset.originalRecords = dynatable.settings.dataset.records;
                        dynatable.process();
                        dynatable.processingIndicator.hide();
                        setupInputs();
                    },
                    error: function (data) {
                    }
                });
            }
        });
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
    setupInputs();


});