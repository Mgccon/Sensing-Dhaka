(function()
{
    freeboard.loadDatasourcePlugin({
        "type_name"         : "appiot_datasource_plugin",
        "display_name"      : "AppIoT",
        "description"       : "Ericsson AppIoT Data Source Plugin",
        "external_scripts"  : 
        [
            "https://ajax.aspnetcdn.com/ajax/signalr/jquery.signalr-2.2.1.min.js",
            //"https://ajax.googleapis.com/ajax/libs/angularjs/1.5.6/angular.min.js",
            "https://eappiot-api.sensbysigma.com/signalr/hubs"
        ],
        "settings"          : 
        [
            {
            "name"         : "sensor_id",
            "display_name" : "Sensor ID",
            "type"         : "text",
            "description"  : "Sensor ID of interest",
            "default_value": "fa05d7e2-c87a-4c08-b4b9-7e7e044006f5",
                    "required" : true
          },
          {
            "name"         : "network_id",
            "display_name" : "Network ID",
            "type"         : "text",
            "description"  : "Network ID",
            "default_value": "a94163f8-e20f-455f-b873-6b8181e3bbbb",
                    "required" : true
          },
          {
            "name"         : "api_key",
            "display_name" : "API Key",
            "type"         : "text",
            "description"  : "Your API Key value",
            "default_value": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHBpcmVzIjoiMjAxNy0wMy0xMlQxMjoyMDozNy4wNzMrMDA6MDAiLCJleHAiOjE0ODkzMjEyMzcsIm5iZiI6LTYyMTM1NTk2ODAwLCJpYXQiOi02MjEzNTU5NjgwMCwibmFtZSI6ImpvaG4gc25vdyIsInRva2VuVHlwZSI6ImFjY2Vzc1Rva2VuIiwiaXNzdWVkIjoiMDAwMS0wMS0wMVQwMDowMDowMCswMDowMCIsInVzZXJJZCI6IjAwMDAwMDAwLTAwMDAtMDAwMC0wMDAwLTAwMDAwMDAwMDAwMCJ9.MiERlNgsYinfXr34lZREwxYh7V8+VTW5L3Y/zFiJxCA=",
                    "required" : true
          }
          
        ],

        newInstance         : function(settings, newInstanceCallback, updateCallback)
        {
            newInstanceCallback(new myDatasourcePlugin(settings, updateCallback));
        }
    });

    var myDatasourcePlugin = function(settings, updateCallback)
    {
        var self = this;

        var currentSettings = settings;

        var data = {};

        var initialized = false;

        /*function getData()
        {
            updateCallback(currentValue);
        }*/

        var refreshTimer;

        function createRefreshTimer(interval)
        {
            if(refreshTimer)
            {
                clearInterval(refreshTimer);
            }

            refreshTimer = setInterval(function()
            {
                //getData();
            }, interval);
        }

        self.onSettingsChanged = function(newSettings)
        {
            currentSettings = newSettings;
        }

        self.updateNow = function()
        {
            //getData();
        }

        self.onDispose = function()
        {
            clearInterval(refreshTimer);
            refreshTimer = undefined;

            $.connection.measurementHub.server.removeSensor(currentSettings.sensor_id)
                .done(function () {
                    console.info('SensorHub: Unsubscribing to sensor ' + currentSettings.sensor_id + ' successful.');

                }).fail(function (error) {
                    console.warn('Failed to subscribe to sensorId ' + currentSettings.sensor_id + ': ' + error);
                });
        }

        getRealtimeToken();

        $.connection.hub.url = "https://eappiot-api.sensbysigma.com/signalr";
        $.connection.hub.logging = true;
        var hub = $.connection.hub.createHubProxies('measurementHub');
         
        // This event handler will handle all new measurements being sent from the server to the client
        // JSON structure received in message: {SensorId: "aef51c78-84be-412e-905e-0f42114aaea8", UnixTimestamp: 1472200483722, Values: Array[1]}
        hub.measurementHub.on("NewMeasurement", function (measurement) {
            console.log( new Date(measurement.UnixTimestamp) + " - Sensor with Id " + measurement.SensorId + " sent value: " + measurement.Values[0]);
            //document.getElementById("ReceivedMeasurements").innerHTML = new Date(measurement.UnixTimestamp).toLocaleString() + " - Sensor with Id " + measurement.SensorId + " sent value: " + measurement.Values[0] + "<br/>" + document.getElementById("ReceivedMeasurements").innerHTML;
            
            //var value = measurement.Values[0];
            //var sensor_id = measurement.sensorId;
            //currentValue.value = value;
            //value[String(measurement.SensorId)] = measurement.Values[0];
            //var clone = JSON.parse(JSON.stringify(measurement));
            data[measurement.SensorId] =measurement.Values[0]; 
            updateCallback(data);
            //updateCallback(1333.7);
        });

        function getRealtimeToken() {
            $.ajax({
                url: 'https://eappiot-api.sensbysigma.com/api/v2/deviceNetwork/realtimeToken',
                type: 'post',
                data: {},
                headers: {
                    "Authorization": "Bearer " + currentSettings.api_key,
                    "X-DeviceNetwork": currentSettings.network_id
                },
                dataType: 'json',
                success: function (data) {
                    console.info("Successfully received realtime token from REST API: " + data.Token);
                    currentSettings.signalrAccessToken = data.Token;
                    
                    $.connection.hub.start().done(finalizeInit).fail(function(){console.log("Could not connect!"); });
                },
                error: function(XMLHttpRequest, textStatus, errorThrown) {
              console.info("Failed to aquire realtime token from REST API: " + textStatus + " " + errorThrown);
                }
            });
        };

        function finalizeInit() {
            console.info("Hub started, now authenticate client");
 
            // To be able to receive measurements one need to authenticate once to be able to start subscribing to sensor data
            // This can only be done if successful start of measurementhub
            $.connection.measurementHub.server.authenticate(currentSettings.network_id, 
                currentSettings.signalrAccessToken);

            

            $.connection.measurementHub.server.addSensor(currentSettings.sensor_id)
                    .done(function () {
                        console.info('SensorHub: Subscribing to sensor ' + currentSettings.sensor_id + ' successful.');
                    }).fail(function (error) {
                        console.warn('Failed to subscribe to sensorId ' + currentSettings.sensor_id + ': ' + error);
                    });
        };
    }
}());