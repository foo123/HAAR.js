package haartojs;

import java.io.*;
import java.util.*;
import org.jdom.*;
import org.jdom.input.*;

public class Test
{

	public static void main(String[] args) throws IOException
	{
		String filename=args[0];
		org.jdom.Document document=null;
		SAXBuilder sxb = new SAXBuilder();
		try
		{
			document = sxb.build(new File(filename));
		}
		catch(Exception e){e.printStackTrace();return;}
	
		System.out.print("var "+args[1]+"={");
		Element racine = (Element) document.getRootElement().getChildren().get(0);
		Scanner scanner = new Scanner(racine.getChild("size").getText());
		String size1 = new Integer(scanner.nextInt()).toString();
		String size2 = new Integer(scanner.nextInt()).toString();
		System.out.print("size1:"+size1+",size2:"+size2);
		Iterator it=racine.getChild("stages").getChildren("_").iterator();
		System.out.print(",stages:[");
		int i1=0;
		while(it.hasNext())
		{
			if (i1==0)
				System.out.print("{");
			else
				System.out.print(",{");
			Element stage=(Element)it.next();
			String thres=stage.getChild("stage_threshold").getText();
			System.out.print("thres:"+thres);
			Iterator it2=stage.getChild("trees").getChildren("_").iterator();
			System.out.print(",trees:[");
			int i2=0;
			while(it2.hasNext())
			{
				if (i2==0)
					System.out.print("{");
				else
					System.out.print(",{");
				Element tree = ((Element)it2.next());
				Iterator it4 = tree.getChildren("_").iterator();
				System.out.print("feats:[");
				int i4=0;
				while(it4.hasNext())
				{
					if (i4==0)
						System.out.print("{");
					else
						System.out.print(",{");
					Element feature=(Element) it4.next();
					String thres2=feature.getChild("threshold").getText();
					String left_node="-1";
					String left_val = "0";
					String has_left_val ="false";
					String right_node="-1";
					String right_val = "0";
					String has_right_val ="false";
					Element e;
					if((e=feature.getChild("left_val"))!=null)
					{
						left_val = e.getText();
						has_left_val="true";
					}
					else
					{
						left_node = feature.getChild("left_node").getText();
						has_left_val="false";
					}

					if((e=feature.getChild("right_val"))!=null)
					{
						right_val = e.getText();
						has_right_val="true";
					}
					else
					{
						right_node = feature.getChild("right_node").getText();
						has_right_val="false";
					}
					System.out.print("thres:"+thres2);
					System.out.print(",has_l:"+has_left_val+",l_val:"+left_val+",l_node:"+left_node);
					System.out.print(",has_r:"+has_right_val+",r_val:"+right_val+",r_node:"+right_node);
					Iterator it3=feature.getChild("feature").getChild("rects").getChildren("_").iterator();
					int i3=0;
					System.out.print(",rects:[");
					while(it3.hasNext())
					{
						if (i3==0)
							System.out.print("{");
						else
							System.out.print(",{");
						String[] s = ((Element) it3.next()).getText().trim().split(" ");
						System.out.print("x1:"+s[0]+",x2:"+s[1]+",y1:"+s[2]+",y2:"+s[3]+",f:"+s[4]);
						System.out.print("}");
						i3++;
					}
					System.out.print("]}");
					i4++;
				}
				System.out.print("]}");
				i2++;
			}
			System.out.print("]}");
			i1++;
		}
		System.out.print("]};\n");
	}
}