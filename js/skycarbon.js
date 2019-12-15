var current_data_url = 'https://cors-anywhere.herokuapp.com/http://flightaware.com/live/aircrafttype/';
var emission_map_url = 'emission_map.json';
var element = document.getElementById("lessInfoObj");

/* Global vars */
var skyDiv = document.getElementById("sky");
var w = window.innerWidth;
var h = window.innerHeight;
var num_clouds = 10;
var max_distance = 200;

var emission_map = {};
var total_emissions_kg = 0;
var last_loaded_timestamp = 0;

/* Statistics update interval & jitter */
var jitter_enabled = true;
var data_refresh_rate_ms = 70;
var data_refresh_jitter_ms = 10;

/* Calculation constants */
var carbon_liters_per_kg = 511;
var hot_air_balloon_avg_liters = 2500000
var start_time = window.performance.now() / 1000;
var carbon_kg_absorption_per_year = 18;
var trees_to_offset_kg = (365 / carbon_kg_absorption_per_year);
var flight_data_refresh_rate = 30000;

/* List of JSON objs */
var global_aircraft_tracker = new Array();
var total_flights = 0;

function R(min,max) {
    return min+Math.random()*(max-min)
};

/* Draw clouds */
for (i = 0; i < num_clouds; i++) {
    var div = document.createElement('div');
    var cloud_data = generate_cloud_data();
    $(div).css('z-index', Math.round(max_distance - cloud_data[0]));
    div.setAttribute('speed', cloud_data[5]);

    TweenMax.set(div, {
        attr:{class:'cloudy'},
        x:w+R(100, w),
        y:cloud_data[1],
        scale:cloud_data[2],
        opacity:cloud_data[4],
        rotationY: R(0, 10) > 5 ? 180 : 0
    });

    skyDiv.appendChild(div);
    cloud_animation(div);
}

function cloud_animation(el) {
    TweenMax.to(el, el.getAttribute('speed'),{
        x:-300,
        rotation:1,
        repeat: -1,
        yoyo:false,
        ease:Linear.easeNone
    });
}

function generate_cloud_data() {
    var distance = R(0, max_distance);
    var y = h - (250 + (2 * distance));
    var scale = 2 - (1.5*(distance / max_distance));
    var animation_dur = scale;
    var opacity = 1 - (.25 * (distance/max_distance));
    var speed = 5 + (5 * Math.pow(distance / (max_distance / 2), 1.75))
    return [distance, y, scale, animation_dur, opacity, speed];
}

/* Drawing the airplane */
var plane = document.createElement('div');
TweenMax.set(plane, {
    attr: {class:'airplane'},
    y: 0,
    rotation:1,
    scale: 2.3,
    transformOrigin: '50% 50%'
});

TweenMax.to(plane, 4, {
    rotation:-1,
    y:'-=60',
    repeat: -1,
    yoyo: true,
    ease:Sine.easeInOut,
    transformOrigin: '50% 50%'
});

skyDiv.appendChild(plane);

/* Load emissions map*/
$.ajax({
    url: emission_map_url,
    type: 'get',
    dataType: 'json',
    success:function(response) {
        emission_map = response;
    }
});

/* Update flight data every 30s */
function load_current_flight_data() {
    $.ajax({
        url: current_data_url,
        type: "get",
        dataType:'text',
        success: function(response) {
            var result = $($.parseHTML(response)).find(".prettyTable");
            var response_arr = new Array();
            var flights = 0;
            $(result).find("tr").each(function(e, el) {
                var entries = $(el).find('td');
                var aircraft_num = parseInt($(entries[0]).text());
                var aircraft_type = $(entries[2]).text();

                if (aircraft_type.trim() && aircraft_num > 0) {
                    flights += aircraft_num;
                    response_arr.push({aircraft: aircraft_type, num: aircraft_num});
                }
            });
            
            global_aircraft_tracker = response_arr.slice();
            total_flights = flights;
            $("#airborneFlights").html(`${flights.toLocaleString()} <b><br/>airborne flights</b>`);
            $("#livePlanes").text(`${flights.toLocaleString()}`);
            
            var update_time = new Date().toLocaleString();
            $("#livePlanes").attr('title', `Live Airborne Aircrafts 
                                            Updated: ${update_time}`).tooltip('_fixTitle');
        }
    });
}

/* Refresh live flight data */
load_current_flight_data();
setInterval(load_current_flight_data, flight_data_refresh_rate);

/* About modal behavior */
$("#aboutButton").on('click', function() {
    $("#exampleModal").modal();
});

/* More/Less Info Hooks */
$("#moreInfo").on('click', function(e) {
    EPPZScrollTo.scrollTo(window.outerHeight);
});

$("#lessInfo").on('click', function(e) {
    EPPZScrollTo.scrollTo(0);
});

/* Functions for updating stats */
function push_carbon_calculation(emissions_kg, time) {
    total_emissions_kg += emissions_kg;
    
    var rounded_kg = Math.round(total_emissions_kg);
    $("#carbonkG").text(`${rounded_kg.toLocaleString()} kg`);
    $("#totalCarbon").html(`${rounded_kg.toLocaleString()} <b><br/>kg</b>`);

    var carbon_per_day = Math.round((86400 / (time - start_time)) * rounded_kg);
    $("#co2PerDay").html(`${carbon_per_day.toLocaleString()} <b><br/>kg</b>`);

    var carbon_per_hour = Math.round((3600 / (time - start_time)) * rounded_kg);
    $("#co2PerHour").html(`${carbon_per_hour.toLocaleString()} <b><br/>kg</b>`)

    var carbon_per_minute = Math.round(carbon_per_hour / 60);
    $("#co2PerMinute").html(`${carbon_per_minute.toLocaleString()} <b><br/>kg</b>`);

    var carbon_per_second = Math.round(carbon_per_minute / 60);
    $("#co2PerSecond").html(`${carbon_per_second.toLocaleString()} <b><br/>kg</b>`);

    var trees_to_offset = Math.round(total_emissions_kg * trees_to_offset_kg);
    $("#treesToOffset").html(`${trees_to_offset.toLocaleString()} <b><br/>trees</b>`);

    var volume_output = carbon_liters_per_kg * total_emissions_kg;
    var balloons_to_offset = Math.round(volume_output / hot_air_balloon_avg_liters);
    $("#balloonsToOffset").html(`${balloons_to_offset.toLocaleString()} <b><br/>balloons</b>`)
}

function calculate_carbon_emissions(aircraft_data, reference_map, time_elapsed_sec) {
    if (!aircraft_data || aircraft_data.length == 0) return 0;
    var default_rate = reference_map['default']['kg_per_sec'];

    return aircraft_data.reduce(function(sum, entry) {
        var reference_data = reference_map[entry['aircraft'].trim()];
        var rate = reference_data ? reference_data['kg_per_sec'] : default_rate;
        var entry_num = entry['num'];
        return sum + (rate * entry_num * time_elapsed_sec);
    }, 0);
}

var step_carbon_emissions = function() {
    var current_timestamp = window.performance.now() / 1000;

    if (!last_loaded_timestamp) {
        last_loaded_timestamp = current_timestamp;
        setTimeout(step_carbon_emissions, data_refresh_rate_ms);
        return;
    }

    var time_elapsed_sec = current_timestamp - last_loaded_timestamp;
    last_loaded_timestamp = current_timestamp;

    var local_carbon_calculation = calculate_carbon_emissions(global_aircraft_tracker, emission_map, time_elapsed_sec);
    push_carbon_calculation(local_carbon_calculation, current_timestamp);

    var refresh_interval = data_refresh_rate_ms;
    if (jitter_enabled) {
        refresh_interval += (Math.random() * data_refresh_jitter_ms);
    }
    
    setTimeout(step_carbon_emissions, refresh_interval);
    
}
step_carbon_emissions();
setTimeout(step_carbon_emissions, data_refresh_rate_ms);


/**
 *
 * Created by Borbás Geri on 12/17/13
 * Copyright (c) 2013 eppz! development, LLC.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 */

var EPPZScrollTo =
{
    /**
     * Helpers.
     */
    documentVerticalScrollPosition: function()
    {
        if (self.pageYOffset) return self.pageYOffset; // Firefox, Chrome, Opera, Safari.
        if (document.documentElement && document.documentElement.scrollTop) return document.documentElement.scrollTop; // Internet Explorer 6 (standards mode).
        if (document.body.scrollTop) return document.body.scrollTop; // Internet Explorer 6, 7 and 8.
        return 0; // None of the above.
    },

    viewportHeight: function()
    { return (document.compatMode === "CSS1Compat") ? document.documentElement.clientHeight : document.body.clientHeight; },

    documentHeight: function()
    { return (document.height !== undefined) ? document.height : document.body.offsetHeight; },

    documentMaximumScrollPosition: function()
    { return this.documentHeight() - this.viewportHeight(); },

    elementVerticalClientPositionById: function(id)
    {
        var element = document.getElementById(id);
        var rectangle = element.getBoundingClientRect();
        console.log(rectangle.top)
        return rectangle.top;
    },

    /**
     * Animation tick.
     */
    scrollVerticalTickToPosition: function(currentPosition, targetPosition)
    {
        var filter = 0.2;
        var fps = 60;
        var difference = parseFloat(targetPosition) - parseFloat(currentPosition);

        // Snap, then stop if arrived.
        var arrived = (Math.abs(difference) <= 0.5);
        if (arrived)
        {
            // Apply target.
            scrollTo(0.0, targetPosition);
            return;
        }

        // Filtered position.
        currentPosition = (parseFloat(currentPosition) * (1.0 - filter)) + (parseFloat(targetPosition) * filter);

        // Apply target.
        scrollTo(0.0, Math.round(currentPosition));

        // Schedule next tick.
        setTimeout("EPPZScrollTo.scrollVerticalTickToPosition("+currentPosition+", "+targetPosition+")", (1000 / fps));
    },

    scrollTo: function(targetPosition) {
        this.scrollVerticalTickToPosition(this.documentVerticalScrollPosition(), targetPosition)
    },

    /**
     * For public use.
     *
     * @param id The id of the element to scroll to.
     * @param padding Top padding to apply above element.
     */
    scrollVerticalToElementById: function(id, padding)
    {
        var element = document.getElementById(id);
        if (element == null)
        {
            console.warn('Cannot find element with id \''+id+'\'.');
            return;
        }

        var targetPosition = this.documentVerticalScrollPosition() + this.elementVerticalClientPositionById(id) - padding;
        var currentPosition = this.documentVerticalScrollPosition();

        // Clamp.
        var maximumScrollPosition = this.documentMaximumScrollPosition();
        if (targetPosition > maximumScrollPosition) targetPosition = maximumScrollPosition;

        // Start animation.
        this.scrollVerticalTickToPosition(currentPosition, targetPosition + window.outerHeight);
    }
};