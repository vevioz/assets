<?php 
    $nodes = array(
        'cdn-10.vevioz.com',
      	'cdn-30.vevioz.com',
        'cdn-40.vevioz.com',
    );
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>Heavy Transcoding Processes</title>
    <link rel="stylesheet" href="https://bootswatch.com/4/flatly/bootstrap.min.css">
    <link rel="icon" href="https://assets.vevioz.com/favicon.ico" />
    <style>
        html, body {
            width: 100%;
            height: 100%;
            background: #2e2e2e;
            overflow-x: hidden;
        }
    </style>

    <script src="https://code.jquery.com/jquery-3.3.1.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.14.3/umd/popper.min.js"></script>
    <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.1.3/js/bootstrap.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/raphael/2.2.7/raphael.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/justgage/1.2.9/justgage.min.js"></script>
</head>
<body>
    
    <div class="container">
        <h2 class="text-center text-white">Heavy Transcoding Processes</h2>
        <?php foreach($nodes as $key => $node) : ?>
            <?php $n = explode('.', $node); 
                if($n[0] == "srv07") {
                    echo '<h2 class="text-white text-center">VPS of Master Node 7</h2>';
                    echo '<hr style="border-top: 1px solid #ccc;">';
                }
                if($n[0] == "srv12") {
                    echo '<h2 class="text-white text-center">VPS of Master Node 6</h2>';
                    echo '<hr style="border-top: 1px solid #ccc;">';
                }
                if($n[0] == "srv17") {
                    echo '<h2 class="text-white text-center">VPS of Master Node 5</h2>';
                    echo '<hr style="border-top: 1px solid #ccc;">';
                }
                if($n[0] == "srv22") {
                    echo '<h2 class="text-white text-center">VPS of Master Node 4</h2>';
                    echo '<hr style="border-top: 1px solid #ccc;">';
                }
                if($n[0] == "srv27") {
                    echo '<h2 class="text-white text-center">VPS of Master Node 3</h2>';
                    echo '<hr style="border-top: 1px solid #ccc;">';
                }
            ?>
            
            <div class="row text-center mt-5">
                <div class="col-md-3">
                    <div class="card text-white bg-info mb-3">
                        <h4 class="card-header">Node</h4>
                        <div class="card-body">
                            <h4 class="card-title"><?php echo $n[0]; ?></h4>
                            <p class="card-text"></p>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card text-white bg-info mb-3">
                        <h4 class="card-header">Transcoding</h4>
                        <div class="card-body">
                            <h4 id="ffmpeg<?php echo $key +1; ?>" class="card-title"></h4>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card text-white bg-info mb-3">
                        <h4 class="card-header">Bandwidth</h4>
                        <div class="card-body">
                            <h4 id="traffic<?php echo $key +1; ?>" class="card-title"></h4>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card text-white bg-info mb-3">
                        <h4 class="card-header">Traffic</h4>
                        <div class="card-body">
                            <h4 id="bandwidth<?php echo $key +1; ?>" class="card-title"></h4>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card text-white bg-primary mb-3">
                        <h4 class="card-header">CPU Cores</h4>
                        <div class="card-body">
                            <h4 id="cores<?php echo $key +1; ?>" class="card-title"></h4>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card text-white bg-primary mb-3">
                        <h4 class="card-header">CPU Clock Speed</h4>
                        <div class="card-body">
                            <h4 id="clock_speed<?php echo $key +1; ?>" class="card-title"></h4>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card text-white bg-primary mb-3">
                        <h4 class="card-header">CPU Usage</h4>
                        <div class="card-body">
                            <h4 id="cpu_usage<?php echo $key +1; ?>" class="card-title"></h4>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card text-white bg-primary mb-3">
                        <h4 class="card-header">GeForce RTX</h4>
                        <div class="card-body">
                            <h4 id="hdd_usage<?php echo $key +1; ?>" class="card-title"></h4>
                        </div>
                    </div>
                </div>
                
            </div>  
            <?php endforeach; ?>        
        </div> <!-- /.container -->
    


    
    <script>
    <?php foreach($nodes as $key => $node) : ?>
        $(document).ready(function() {
            getData<?php echo $key +1; ?>();
            
            setInterval(function(){ 
                getData<?php echo $key +1; ?>();
            }, 1000);
        }); 

        function getData<?php echo $key +1; ?>() {
            $.ajax({
                type: "GET",
                url: "https://<?php echo $node; ?>/statos-api",
                beforeSend: function() {
                    
                },
                success: function(data) {
                    var json = JSON.parse(data);
                    //console.log('success');
                    console.log(json.data);
                    $('#ffmpeg<?php echo $key +1; ?>').html(json.data.ffmpeg);
                    $('#traffic<?php echo $key +1; ?>').html(json.data.network.interface.eth.total);
                    $('#bandwidth<?php echo $key +1; ?>').html(json.data.network.interface.eth.bandwidth);
                    $('#cores<?php echo $key +1; ?>').html(json.data.cpu.num_cores);
                    $('#cpu_usage<?php echo $key +1; ?>').html(json.data.cpu.usage.one + '%');
                    $('#clock_speed<?php echo $key +1; ?>').html(json.data.cpu.frequency);
                    $('#hdd_usage<?php echo $key +1; ?>').html(json.data.hdd[0].percent_used + '%');
                },
                error: function() {
                    console.log('error');

                },
                complete: function() {

                }
            });
            return false;
        }
        <?php endforeach; ?>
    </script>   

</body>
</html>