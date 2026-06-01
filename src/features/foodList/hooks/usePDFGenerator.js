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
      const lightBlue = [224, 247, 250]; // Light blue header background
      const darkGray = [60, 60, 60];
      const mediumGray = [120, 120, 120];
      
      // Header background
      doc.setFillColor(...lightBlue);
      doc.rect(0, 0, pageWidth, 50, 'F');
      
      // Restaurant name
      doc.setTextColor(...darkGray);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      const titleWidth = doc.getTextWidth(finalRestaurantName.toUpperCase());
      doc.text(finalRestaurantName.toUpperCase(), (pageWidth - titleWidth) / 2, 28);
      
      // Subtitle
      doc.setFontSize(11);
      doc.setFont("helvetica", "italic");
      const subtitle = "Menu";
      const subtitleWidth = doc.getTextWidth(subtitle);
      doc.text(subtitle, (pageWidth - subtitleWidth) / 2, 38);
      
      // Layout settings
      const margin = 20;
      const columnWidth = (pageWidth - 3 * margin) / 2; // Two columns with center margin
      const leftColumnX = margin;
      const rightColumnX = margin + columnWidth + margin;
      
      let leftColumnY = 65;
      let rightColumnY = 65;
      let currentColumn = 'left'; // Track which column we're in
      
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
      
      const categories = Object.keys(itemsByCategory);
      
      // Calculate items per column (roughly)
      const totalItems = menuItems.length + categories.length;
      const itemsPerColumn = Math.ceil(totalItems / 2);
      let processedItems = 0;
      
      // Generate content for each category
      Object.entries(itemsByCategory).forEach(([categoria, items]) => {
        const currentY = currentColumn === 'left' ? leftColumnY : rightColumnY;
        // Check if we need to switch columns or add new page
        if (currentY + 40 > pageHeight - 30) {
          if (currentColumn === 'left') {
            currentColumn = 'right';
          } else {
            doc.addPage();
            leftColumnY = 30;
            rightColumnY = 30;
            currentColumn = 'left';
          }
        }
        
        const yPos = currentColumn === 'left' ? leftColumnY : rightColumnY;
        const xPos = currentColumn === 'left' ? leftColumnX : rightColumnX;
        
        // Category header
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...darkGray);
        doc.text(categoria.toUpperCase(), xPos, yPos);
        
        // Category underline
        doc.setDrawColor(...primaryColor);
        doc.setLineWidth(0.5);
        doc.line(xPos, yPos + 2, xPos + columnWidth, yPos + 2);
        
        let itemY = yPos + 12;
        
        // Items in category
        items.forEach((item) => {
          // Check if we need to switch columns or add page
          if (itemY + 20 > pageHeight - 30) {
            if (currentColumn === 'left') {
              currentColumn = 'right';
              itemY = rightColumnY;
            } else {
              doc.addPage();
              leftColumnY = 30;
              rightColumnY = 30;
              currentColumn = 'left';
              itemY = leftColumnY;
            }
          }
          
          const itemX = currentColumn === 'left' ? leftColumnX : rightColumnX;
          
          // Item name
          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...darkGray);
          
          let itemName = item.nome.toUpperCase();
          const maxItemWidth = columnWidth - 30; // Reserve space for price
          
          if (doc.getTextWidth(itemName) > maxItemWidth) {
            while (doc.getTextWidth(itemName + "...") > maxItemWidth && itemName.length > 0) {
              itemName = itemName.slice(0, -1);
            }
            itemName += "...";
          }
          
          doc.text(itemName, itemX, itemY);
          
          // Price (right-aligned in column)
          const price = new Intl.NumberFormat('pt-BR', { 
            style: 'currency', 
            currency: 'BRL' 
          }).format(item.valor);
          
          const priceWidth = doc.getTextWidth(price);
          doc.setFont("helvetica", "normal");
          doc.text(price, itemX + columnWidth - priceWidth, itemY);
          
          itemY += 6;
          
          // Description
          if (item.descricao) {
            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(...mediumGray);
            
            const descLines = doc.splitTextToSize(item.descricao, columnWidth);
            const maxLines = 2; // Limit description to 2 lines
            const linesToShow = descLines.slice(0, maxLines);
            
            linesToShow.forEach((line, index) => {
              if (index === maxLines - 1 && descLines.length > maxLines) {
                line = line.slice(0, -3) + "...";
              }
              doc.text(line, itemX, itemY);
              itemY += 4;
            });
          }
          
          // Allergies (if any)
          if (item.alergias && item.alergias.length > 0) {
            doc.setFontSize(7);
            doc.setFont("helvetica", "italic");
            doc.setTextColor(180, 50, 50);
            const allergyText = "Alérgenos: " + item.alergias.join(", ");
            const allergyLines = doc.splitTextToSize(allergyText, columnWidth);
            allergyLines.forEach(line => {
              doc.text(line, itemX, itemY);
              itemY += 3.5;
            });
          }
          
          itemY += 8; // Space between items
        });
        
        // Update column positions
        if (currentColumn === 'left') {
          leftColumnY = itemY + 8;
          // Switch to right column for next category if we have space
          if (processedItems < itemsPerColumn) {
            currentColumn = 'right';
          }
        } else {
          rightColumnY = itemY + 8;
          currentColumn = 'left';
        }
        
        processedItems += items.length + 1; // +1 for category header
      });
      
      // Footer
      const currentDate = new Date().toLocaleDateString('pt-BR');
      doc.setFontSize(7);
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