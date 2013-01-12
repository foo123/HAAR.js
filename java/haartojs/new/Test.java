/*     */ package haartojs;
/*     */ 
/*     */ import java.io.File;
/*     */ import java.io.IOException;
/*     */ import java.io.PrintStream;
/*     */ import java.util.Iterator;
/*     */ import java.util.List;
/*     */ import java.util.Scanner;
/*     */ import org.jdom.Document;
/*     */ import org.jdom.Element;
/*     */ import org.jdom.input.SAXBuilder;
/*     */ 
/*     */ public class Test
/*     */ {
/*     */   public static void main(String[] args)
/*     */     throws IOException
/*     */   {
/*  13 */     String filename = args[0];
/*  14 */     Document document = null;
/*  15 */     SAXBuilder sxb = new SAXBuilder();
/*     */     try
/*     */     {
/*  18 */       document = sxb.build(new File(filename));
/*     */     } catch (Exception e) {
/*  20 */       e.printStackTrace(); return;
/*     */     }

			  System.out.print("(function() {");
  			  System.out.print("var root = this;");
/*  22 */     System.out.print("var " + args[1] + "={");
/*  23 */     Element racine = (Element)document.getRootElement().getChildren().get(0);
/*  24 */     Scanner scanner = new Scanner(racine.getChild("size").getText());
/*  25 */     String size1 = new Integer(scanner.nextInt()).toString();
/*  26 */     String size2 = new Integer(scanner.nextInt()).toString();
/*  27 */     System.out.print("size1:" + size1 + ",size2:" + size2);
/*  28 */     Iterator it = racine.getChild("stages").getChildren("_").iterator();
/*  29 */     System.out.print(",stages:[");
/*  30 */     int i1 = 0;
/*  31 */     while (it.hasNext())
/*     */     {
/*  33 */       if (i1 == 0)
/*  34 */         System.out.print("{");
/*     */       else
/*  36 */         System.out.print(",{");
/*  37 */       Element stage = (Element)it.next();
/*  38 */       String thres = stage.getChild("stage_threshold").getText();
/*  39 */       System.out.print("thres:" + thres);
/*  40 */       Iterator it2 = stage.getChild("trees").getChildren("_").iterator();
/*  41 */       System.out.print(",trees:[");
/*  42 */       int i2 = 0;
/*  43 */       while (it2.hasNext())
/*     */       {
/*  45 */         if (i2 == 0)
/*  46 */           System.out.print("{");
/*     */         else
/*  48 */           System.out.print(",{");
/*  49 */         Element tree = (Element)it2.next();
/*  50 */         Iterator it4 = tree.getChildren("_").iterator();
/*  51 */         System.out.print("feats:[");
/*  52 */         int i4 = 0;
/*  53 */         while (it4.hasNext())
/*     */         {
/*  55 */           if (i4 == 0)
/*  56 */             System.out.print("{");
/*     */           else
/*  58 */             System.out.print(",{");
/*  59 */           Element feature = (Element)it4.next();
/*  60 */           String thres2 = feature.getChild("threshold").getText();
/*  61 */           String left_node = "-1";
/*  62 */           String left_val = "0";
/*  63 */           String has_left_val = "false";
/*  64 */           String right_node = "-1";
/*  65 */           String right_val = "0";
/*  66 */           String has_right_val = "false";
/*     */           Element e;
/*  68 */           if ((e = feature.getChild("left_val")) != null)
/*     */           {
/*  70 */             left_val = e.getText();
/*  71 */             has_left_val = "true";
/*     */           }
/*     */           else
/*     */           {
/*  75 */             left_node = feature.getChild("left_node").getText();
/*  76 */             has_left_val = "false";
/*     */           }
/*     */ 
/*  79 */           if ((e = feature.getChild("right_val")) != null)
/*     */           {
/*  81 */             right_val = e.getText();
/*  82 */             has_right_val = "true";
/*     */           }
/*     */           else
/*     */           {
/*  86 */             right_node = feature.getChild("right_node").getText();
/*  87 */             has_right_val = "false";
/*     */           }
/*  89 */           System.out.print("thres:" + thres2);
/*  90 */           System.out.print(",has_l:" + has_left_val + ",l_val:" + left_val + ",l_node:" + left_node);
/*  91 */           System.out.print(",has_r:" + has_right_val + ",r_val:" + right_val + ",r_node:" + right_node);
/*  92 */           Iterator it3 = feature.getChild("feature").getChild("rects").getChildren("_").iterator();
/*  93 */           int i3 = 0;
/*  94 */           System.out.print(",rects:[");
/*  95 */           while (it3.hasNext())
/*     */           {
/*  97 */             if (i3 == 0)
/*  98 */               System.out.print("{");
/*     */             else
/* 100 */               System.out.print(",{");
/* 101 */             String[] s = ((Element)it3.next()).getText().trim().split(" ");
/* 102 */             System.out.print("x1:" + s[0] + ",x2:" + s[1] + ",y1:" + s[2] + ",y2:" + s[3] + ",f:" + s[4]);
/* 103 */             System.out.print("}");
/* 104 */             i3++;
/*     */           }
/* 106 */           System.out.print("]}");
/* 107 */           i4++;
/*     */         }
/* 109 */         System.out.print("]}");
/* 110 */         i2++;
/*     */       }
/* 112 */       System.out.print("]}");
/* 113 */       i1++;
/*     */     }
/* 115 */     System.out.print("]};\n");
              System.out.print("if(typeof exports !== 'undefined'){ ");
              System.out.print("exports."+args[1]+" = "+args[1]+";} else {");
			  System.out.print("root."+args[1]+" = "+args[1]+";}");
              System.out.print("}).call(this);");
/*     */   }
/*     */ }
