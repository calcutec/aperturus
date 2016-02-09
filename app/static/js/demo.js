/*
 * JavaScript Load Image Demo JS
 * https://github.com/blueimp/JavaScript-Load-Image
 *
 * Copyright 2013, Sebastian Tschan
 * https://blueimp.net
 *
 * Licensed under the MIT license:
 * http://www.opensource.org/licenses/MIT
 */

/*global window, document, loadImage, HTMLCanvasElement, $ */

$(function () {
    'use strict';

    var result = $('#result'),
        exifNode = $('#exif'),
        thumbNode = $('#thumbnail'),
        actionsNode = $('#actions'),
        currentFile,
        replaceResults = function (img) {
            var content;
            if (!(img.src || img instanceof HTMLCanvasElement)) {
                content = $('<span>Loading image file failed</span>');
            } else {
                content = $('<img src="_blank">').append(img)
                    // .attr('download', currentFile.name)
                    .attr('src', img.src || img.toDataURL());
            }
            result.children().replaceWith(content);
            if (img.getContext) {
                actionsNode.show();
            }
        },
        displayImage = function (file, options) {
            currentFile = file;
            if (!loadImage(file, replaceResults, options)) {
                result.children().replaceWith($('<span>Your browser does not support the URL or FileReader API.</span>'));
            }
        },
        displayExifData = function (exif) {
            var tags = exif.getAll(),
                table = exifNode.find('table').empty(),
                row = $('<tr></tr>'),
                cell = $('<td></td>'),
                prop;
            for (prop in tags) {
                if (tags.hasOwnProperty(prop)) {
                    table.append(
                        row.clone()
                            .append(cell.clone().text(prop))
                            .append(cell.clone().text(tags[prop]))
                    );
                }
            }
            this.exifNode.show();
        },
        dropChangeHandler = function (e) {
            e.preventDefault();
            e = e.originalEvent;
            var target = e.dataTransfer || e.target,
                file = target && target.files && target.files[0],
                options = {
                    maxWidth: 1296
                };
            if (!file) {
                return;
            }
            exifNode.hide();
            thumbNode.hide();
            loadImage.parseMetaData(file, function (data) {
                if (data.exif) {
                    options.orientation = data.exif.get('Orientation');
                    displayExifData(data.exif);
                }
                displayImage(file, options);
            });
        },
        coordinates;
    // Hide URL/FileReader API requirement message in capable browsers:
    if (window.createObjectURL || window.URL || window.webkitURL || window.FileReader) {
        result.children().hide();
    }
    $(document)
         .on('dragover', function (e) {
             e.preventDefault();
             e = e.originalEvent;
             e.dataTransfer.dropEffect = 'copy';
         })
         .on('drop', dropChangeHandler);
    $('#file-input').on('change', dropChangeHandler);
});
