<?php

/*
* #!/usr/bin/env php
*/

/**
* CLI script
* Convert Haar XML cascade files to Javascript format for faster execution
* @package HAAR.js
*
* version: 0.2
*
* @author Nikos M.  (http://nikos-web-development.netai.net/)
* https://github.com/foo123/HAAR.js
*
**/

error_reporting(E_ALL);

if (!class_exists('HaarToJsConverter'))
{

class HaarToJsConverter
{
    public static function error($msg)
    {
        trigger_error ( $msg,  E_USER_WARNING );
        die(1);
    }
    
    public static function toArray($element) 
    {
        //$element = is_string($element) ? htmlspecialchars_decode(trim($element), ENT_QUOTES) : $element;
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
                //$v = is_string($v) ? htmlspecialchars_decode(trim($v), ENT_QUOTES) : $v;
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
                // numeric arrays when -> toXml take '_item' suffixes
                // do reverse process here, now it is generic
                // not used here yet
                /*if (is_array($element[$k]) && isset($element[$k][$k.'_item']))
                {
                    $element[$k] = array_values((array)$element[$k][$k.'_item']);
                }*/
            }
        }

        if (empty($element)) 
        {
            $element = '';
        }

        return $element;
    }
    
    public static function readXML($file)
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
    
    public static function convert($infile, $var_to_use)
    {
        $data=self::readXML($infile);
        
		$racine = reset($data);
        
        //print_r($racine);
        //return;
        
        // use closure for compatibility with browser, node, common amd and requirejs (similar scheme to Backbone.js)
        echo("(function() {");
        echo("var root = this;");
        echo("var " . $var_to_use . "={");
		$size = explode(' ', trim($racine["size"]));
        echo("size1:" . $size[0] . ",size2:" . $size[1]);
        echo(",stages:[");
		$i1=0;
		foreach ($racine['stages']['_'] as $stage)
		{
            if (0==$i1)
                echo("{");
			else
                echo(",{");
			
			$thres=$stage["stage_threshold"];
			echo("thres:" . $thres);
			echo(",trees:[");
			$i2=0;
			foreach($stage['trees']['_'] as $tree)
			{
				if (0==$i2)
					echo("{");
				else
					echo(",{");
				echo("feats:[");
				$i4=0;
				$feature=$tree['_'];
                /*foreach($tree['_'] as $feature)
				{*/
					if (0==$i4)
						echo("{");
					else
						echo(",{");
					$thres2=$feature["threshold"];
					$left_node="-1";
					$left_val = "0";
					$has_left_val ="false";
					$right_node="-1";
					$right_val = "0";
					$has_right_val ="false";
					$e;
					if(isset($feature["left_val"]))
					{
						$left_val=$feature["left_val"];
						$has_left_val="true";
					}
					else
					{
						$left_node=$feature["left_node"];
						$has_left_val="false";
					}

					if(isset($feature["right_val"]))
					{
						$right_val=$feature["right_val"];
						$has_right_val="true";
					}
					else
					{
						$right_node=$feature["right_node"];
						$has_right_val="false";
					}
					echo("thres:" . $thres2);
					echo(",has_l:" . $has_left_val . ",l_val:" . $left_val . ",l_node:" . $left_node);
					echo(",has_r:" . $has_right_val . ",r_val:" . $right_val . ",r_node:" . $right_node);
					$i3=0;
					echo(",rects:[");
					foreach($feature['feature']['rects']['_'] as $rect)
					{
						if (0==$i3)
							echo("{");
						else
							echo(",{");
						$s = explode(' ', trim($rect));
						echo("x1:" . $s[0] . ",x2:" . $s[1] . ",y1:" . $s[2] . ",y2:" . $s[3] . ",f:" . $s[4]);
						echo("}");
						$i3++;
					}
                    echo("]}");
					$i4++;
				/*}*/
                echo("]}");
				$i2++;
			}
            echo("]}");
			$i1++;
		}
        echo("]};\n");
        echo("if(typeof exports !== 'undefined'){ ");
        echo("exports.".$var_to_use." = ".$var_to_use.";} else {");
        echo("root.".$var_to_use." = ".$var_to_use.";}");
        echo("}).call(this);\n");
    }
}

}
//print_r($argv);
HaarToJsConverter::convert($argv[1], $argv[2]);
