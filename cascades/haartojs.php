#!/usr/bin/env php
<?php
error_reporting(E_ALL);

/**
*
* CLI script
* Convert OpenCV Haar XML cascade files to Javascript or JSON format 
* for faster loading/execution in HAAR.js
*
* @package HAAR.js
* https://github.com/foo123/HAAR.js
*
* @version: 0.3  
*
* IMPORTANT: **
*   conversion is different from previous versions (of this script and the associated HAAR.js lib), 
*   it incorporates the tilted attribute for rectangles (Rainer Lienhart et al.)
*   and also stores rectangle coordinates in array, instead of object
*   so make sure to re-convert your xml cascades for this version
*           **
*
* @author Nikos M.  (http://nikos-web-development.netai.net/)
*
**/

if (!class_exists('HaarToJsConverter'))
{
class HaarToJsConverter
{
    public static function error($msg) { trigger_error ( $msg,  E_USER_WARNING );  die(1); }
    
    protected static function __echo($s="") {  echo $s . PHP_EOL; }
    
    protected static function fileinfo($file)
    {
        $info = pathinfo($file);
        if (!isset($info['filename']))  return '';
        return $info['filename'];
    }
    
    /**
     * parseArgs Command Line Interface (CLI) utility function.
     * @author              Patrick Fisher <patrick@pwfisher.com>
     * @see                 https://github.com/pwfisher/CommandLine.php
     */
    protected function parseArgs($argv = null) 
    {
        $argv = $argv ? $argv : $_SERVER['argv']; array_shift($argv); $o = array();
        for ($i = 0, $j = count($argv); $i < $j; $i++) 
        { 
            $a = $argv[$i];
            if (substr($a, 0, 2) == '--') 
            { 
                $eq = strpos($a, '=');
                if ($eq !== false) {  $o[substr($a, 2, $eq - 2)] = substr($a, $eq + 1); }
                else 
                { 
                    $k = substr($a, 2);
                    if ($i + 1 < $j && $argv[$i + 1][0] !== '-') { $o[$k] = $argv[$i + 1]; $i++; }
                    else if (!isset($o[$k])) { $o[$k] = true; } 
                } 
            }
            else if (substr($a, 0, 1) == '-') 
            {
                if (substr($a, 2, 1) == '=') { $o[substr($a, 1, 1)] = substr($a, 3); }
                else 
                {
                    foreach (str_split(substr($a, 1)) as $k) { if (!isset($o[$k])) { $o[$k] = true; } }
                    if ($i + 1 < $j && $argv[$i + 1][0] !== '-') { $o[$k] = $argv[$i + 1]; $i++; } 
                } 
            }
            else { $o[] = $a; } }
        return $o;
    }
    
    protected static function parse($argv=null)
    {
        $defaultArgs=array(
            'h' => false,
            'help' => false,
            'output' => 'js',
            'xml' => false
        );
        $args = self::parseArgs($argv);
        $args = array_intersect_key($args, $defaultArgs);
        $args = array_merge($defaultArgs, $args);
        
        if ( !$args['xml'] || 0==strlen($args['xml']) || $args['h'] || $args['help'] )
        {
            // If no xml have been passed or help is set, show the help message and exit
            $p=pathinfo(__FILE__);
            $thisFile=(isset($p['extension'])) ? $p['filename'].'.'.$p['extension'] : $p['filename'];
            
            self::__echo ("usage: $thisFile [-h] [--xml=FILE] [--output=TYPE]");
            self::__echo ();
            self::__echo ("Transform OpenCV XML HAAR Cascades");
            self::__echo ("to JavaScript or JSON for use with HAAR.js");
            self::__echo ();
            self::__echo ("optional arguments:");
            self::__echo ("  -h, --help      show this help message and exit");
            self::__echo ("  --xml=FILE      OpenCV XML file (REQUIRED)");
            self::__echo ("  --output=TYPE   js (default) | json (OPTIONAL)");
            self::__echo ("                  Whether to output JavaScript or JSON format");
            self::__echo ();
            
            exit(1);
        }
        $args['output'] = strtolower($args['output']);
        if (!in_array($args['output'], array('js', 'json')))  $args['output'] = 'js';
        
        return $args;
    }
    
    protected static function toArray($element) 
    {
        if (!empty($element) && is_object($element)) 
        {
            $element = (array) $element;
        }
        if (empty($element)) 
        {
            $element = '';
        } 
        if (is_array($element)) 
        {
            foreach ($element as $k => $v) 
            {
                if (empty($v)) 
                {
                    $element[$k] = '';
                    continue;
                }
                $add = self::toArray($v);
                if (!empty($add)) 
                {
                    $element[$k] = $add;
                } 
                else 
                {
                    $element[$k] = '';
                }
            }
        }

        if (empty($element)) 
        {
            $element = '';
        }

        return $element;
    }
    
    protected static function readXML($file)
    {
        $data = array();
        $info = pathinfo($file);
        $is_zip = $info['extension'] == 'zip' ? true : false;
        if ($is_zip && function_exists('zip_open')) 
        {
            $zip = zip_open($file);
            if (is_resource($zip)) 
            {
                $zip_entry = zip_read($zip);
                if (is_resource($zip_entry) && zip_entry_open($zip, $zip_entry))
                {
                    $data = zip_entry_read($zip_entry, zip_entry_filesize($zip_entry));
                    zip_entry_close ( $zip_entry );
                }
                else
                    self::error('No zip entry');
            } 
            else 
            {
                self::error('Unable to open zip file');
            }
        } 
        else 
        {
            $fh = fopen($file, 'r');
            if ($fh) 
            {
                $data = fread($fh, filesize($file));
                fclose($fh);
            }
        }
        
        if (!empty($data)) 
        {
            if (!function_exists('simplexml_load_string')) 
            {
                self::error('The Simple XML library is missing.');
            }
            $xml = simplexml_load_string($data);
            if (!$xml) 
            {
                self::error(sprintf('The XML file (%s) could not be read.', $file));
            }

            $data = self::toArray($xml);
            unset($xml);
            return $data;

        } 
        else 
        {
            self::error('Could not read the import file.');
        }
        self::error('Unknown error during import');
    }
    
    protected static function convert($infile, $var_to_use_in_js=false)
    {
        $data=self::readXML($infile);
        
        $racine = reset($data);
        
        // if js output, 
        // use closure for compatibility with browser, node, common amd and requirejs (similar scheme to Backbone.js)
        if ($var_to_use_in_js)
        {
            echo("(function(root) { var " . $var_to_use_in_js . "=");
        }
        
        // this is strict json output
        echo('{');
        $size = explode(' ', trim($racine["size"]));
        $size1 = isset($size[0]) ? $size[0] : 0;
        $size2 = isset($size[1]) ? $size[1] : 0;
        echo('"size1":' . $size1 . ',"size2":' . $size2);
        
        echo(',"stages":[');
        if (isset($racine['stages']['_']))
        {
            $i1=0;
            foreach ($racine['stages']['_'] as $stage)
            {
                if (0==$i1)  echo('{');
                else  echo(',{');
                
                $thres= (isset($stage["stage_threshold"])) ? $stage["stage_threshold"] : 0;
                echo('"thres":' . $thres);
                echo(',"trees":[');
                
                if (isset($stage['trees']['_']))
                {
                    $i2=0;
                    foreach($stage['trees']['_'] as $tree)
                    {
                        if (0==$i2)  echo('{');
                        else  echo(',{');
                        echo('"feats":[');
                        
                        /*foreach($tree['_'] as $feature)
                        {*/
                        $i4=0;
                        $feature=(isset($tree['_'])) ? $tree['_'] : null;
                        if ($feature)
                        {
                            if (0==$i4) echo('{');
                            else echo(',{');
                            
                            $thres2=(isset($feature["threshold"])) ? $feature["threshold"] : 0;
                            $left_node='-1';
                            $left_val = '0';
                            $has_left_val ='false';
                            $right_node='-1';
                            $right_val = '0';
                            $has_right_val ='false';
                            //$e;
                            if(isset($feature["left_val"]))
                            {
                                $left_val=$feature["left_val"];
                                $has_left_val='true';
                            }
                            else
                            {
                                $left_node=$feature["left_node"];
                                $has_left_val='false';
                            }

                            if(isset($feature["right_val"]))
                            {
                                $right_val=$feature["right_val"];
                                $has_right_val='true';
                            }
                            else
                            {
                                $right_node=$feature["right_node"];
                                $has_right_val='false';
                            }
                            echo('"thres":' . $thres2);
                            echo(',"has_l":' . $has_left_val . ',"l_val":' . $left_val . ',"l_node":' . $left_node);
                            echo(',"has_r":' . $has_right_val . ',"r_val":' . $right_val . ',"r_node":' . $right_node);
                            
                            // incorporate tilted features (Rainer Lienhart et al.)
                            if (isset($feature['feature']['tilted']))
                            {
                                if (1==$feature['feature']['tilted'])  echo(',"tilt":1');
                                else  echo(',"tilt":0');
                            }
                            else
                            {
                                echo(',"tilt":null');
                            }
                            echo(',"rects":[');
                            if (isset($feature['feature']['rects']['_']))
                            {
                                $i3=0;
                                foreach($feature['feature']['rects']['_'] as $rect)
                                {
                                    if (0==$i3)  echo('[');
                                    else  echo(',[');
                                    echo(implode(',', explode(' ', trim($rect))));
                                    echo(']');
                                    $i3++;
                                }
                            }
                            echo(']}');
                            $i4++;
                        }
                        /*}*/
                        echo(']}');
                        $i2++;
                    }
                }
                echo(']}');
                $i1++;
            }
        }
        echo(']}');
        // end json output
        
        // if js output
        if ($var_to_use_in_js)
        {
            echo(";\n");
            echo("if(typeof module !== 'undefined' && module.exports){ module.exports.".$var_to_use_in_js." = ".$var_to_use_in_js."; } ");
            echo("else if(typeof exports !== 'undefined'){ exports.".$var_to_use_in_js." = ".$var_to_use_in_js."; } ");
            //echo("else { root.".$var_to_use_in_js." = ".$var_to_use_in_js."; } ");
            echo("else { this.".$var_to_use_in_js." = ".$var_to_use_in_js."; } ");
            echo("}).call(this);\n");
        }
    }
    
    public static function Main($argv=null)
    {
        $args = self::parse($argv);
        //print_r($args);  exit;
        $infile = realpath($args['xml']);
        if ('js' == $args['output'])
        {
            $var_in_js = strval(self::fileinfo($infile));
        }
        else
        {
            $var_in_js = false;
        }
        self::convert($infile, $var_in_js);
    }
}
}

// do the process
HaarToJsConverter::Main($argv);
