import jsPDF from 'jspdf';
import { useAuth } from "@/contexts/AuthContext";
import { useCorDoRestaurante } from "@/hooks/useCorDoRestaurante";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/config/firebaseConfig";

export function usePDFGenerator() {
  const { idRestaurante } = useAuth();
  const corBase = useCorDoRestaurante();

  const getRestaurantInfo = async () => {
    try {
      const restDoc = await getDoc(doc(db, "restaurantes", idRestaurante));
      if (restDoc.exists()) {
        return restDoc.data();
      }
      return null;
    } catch (error) {
      console.error("Erro ao buscar dados do restaurante:", error);
      return null;
    }
  };

  const hexToRgb = (hex) => {
    if (!hex) return [248, 145, 46]; // Default orange color
    const cleanHex = hex.replace("#", "");
    const bigint = parseInt(cleanHex, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return [r, g, b];
  };

  const generateMenuPDF = async (menuItems, restaurantName = "Restaurante") => {
    try {
      // Get restaurant data
      const restaurantData = await getRestaurantInfo();
      const finalRestaurantName = restaurantData?.nome || restaurantName;
      
      // Create PDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      
      // Color scheme
      const primaryColor = hexToRgb(corBase);
      const lightGray = [245, 245, 245];
      const darkGray = [64, 64, 64];
      
      // Header
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      // Restaurant name
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      const titleWidth = doc.getTextWidth(finalRestaurantName);
      doc.text(finalRestaurantName, (pageWidth - titleWidth) / 2, 25);
      
      // Subtitle
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      const subtitle = "CARDÁPIO";
      const subtitleWidth = doc.getTextWidth(subtitle);
      doc.text(subtitle, (pageWidth - subtitleWidth) / 2, 33);
      
      // Reset color for content
      doc.setTextColor(...darkGray);
      
      let yPosition = 55;
      const margin = 15;
      const lineHeight = 8;
      const itemSpacing = 15;
      
      // Group items by category
      const itemsByCategory = menuItems.reduce((acc, item) => {
        item.categorias.forEach(categoria => {
          if (!acc[categoria]) {
            acc[categoria] = [];
          }
          acc[categoria].push(item);
        });
        return acc;
      }, {});
      
      // Generate content for each category
      Object.entries(itemsByCategory).forEach(([categoria, items]) => {
        // Check if we need a new page
        if (yPosition + 30 > pageHeight - margin) {
          doc.addPage();
          yPosition = margin;
        }
        
        // Category header
        doc.setFillColor(...lightGray);
        doc.rect(margin, yPosition - 3, pageWidth - (2 * margin), 12, 'F');
        
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...primaryColor);
        doc.text(categoria.toUpperCase(), margin + 3, yPosition + 5);
        
        yPosition += itemSpacing;
        doc.setTextColor(...darkGray);
        
        // Items in category
        items.forEach((item) => {
          // Check if we need a new page
          if (yPosition + 25 > pageHeight - margin) {
            doc.addPage();
            yPosition = margin;
          }
          
          // Item name and price line
          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          
          const price = new Intl.NumberFormat('pt-BR', { 
            style: 'currency', 
            currency: 'BRL' 
          }).format(item.valor);
          
          const priceWidth = doc.getTextWidth(price);
          const maxNameWidth = pageWidth - margin * 2 - priceWidth - 5;
          
          // Item name (truncate if too long)
          let itemName = item.nome;
          if (doc.getTextWidth(itemName) > maxNameWidth) {
            while (doc.getTextWidth(itemName + "...") > maxNameWidth && itemName.length > 0) {
              itemName = itemName.slice(0, -1);
            }
            itemName += "...";
          }
          
          doc.text(itemName, margin, yPosition);
          doc.text(price, pageWidth - margin - priceWidth, yPosition);
          
          // Dotted line
          const dotsStart = margin + doc.getTextWidth(itemName) + 3;
          const dotsEnd = pageWidth - margin - priceWidth - 3;
          doc.setFontSize(8);
          doc.setFont("helvetica", "normal");
          let dotX = dotsStart;
          while (dotX < dotsEnd - 2) {
            doc.text(".", dotX, yPosition - 1);
            dotX += 3;
          }
          
          yPosition += lineHeight;
          
          // Description
          if (item.descricao) {
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(100, 100, 100);
            
            const descLines = doc.splitTextToSize(item.descricao, pageWidth - margin * 2);
            descLines.forEach(line => {
              doc.text(line, margin, yPosition);
              yPosition += 5;
            });
            doc.setTextColor(...darkGray);
          }
          
          // Allergies
          if (item.alergias && item.alergias.length > 0) {
            doc.setFontSize(8);
            doc.setFont("helvetica", "italic");
            doc.setTextColor(200, 50, 50);
            doc.text("Alérgenos: " + item.alergias.join(", "), margin, yPosition);
            yPosition += 5;
            doc.setTextColor(...darkGray);
          }
          
          yPosition += itemSpacing - 3;
        });
        
        yPosition += 5;
      });
      
      // Footer
      const currentDate = new Date().toLocaleDateString('pt-BR');
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(150, 150, 150);
      doc.text(`Gerado em: ${currentDate}`, margin, pageHeight - 10);
      
      // Download PDF
      doc.save(`cardapio-${finalRestaurantName.replace(/\s+/g, '-').toLowerCase()}.pdf`);
      
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      throw error;
    }
  };

  return { generateMenuPDF };
}