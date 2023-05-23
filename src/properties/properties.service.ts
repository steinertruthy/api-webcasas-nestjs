import { PrismaClient } from '@prisma/client';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreatePropertyDto } from './dto/create-property.dto';
import { PropertyEntity } from 'src/entities/property.entity';

const prisma = new PrismaClient();

@Injectable()
export class PropertiesService {
  async create(dataProperty: CreatePropertyDto, userId: string) {
    const owner = await prisma.user.findUnique({ where: { id: userId } });

    const newProperty = await prisma.property.create({
      data: { ...dataProperty, ownerId: owner.id },
    });

    return new PropertyEntity(newProperty);
  }

  async uploadPhotos(files: Array<Express.Multer.File>, propertyId: string) {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { PropertyPhotos: true },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }
    const { PropertyPhotos } = property;

    if (PropertyPhotos.length >= 4) {
      throw new ConflictException(
        'The property has already reached the maximum number of photos',
      );
    }

    const countNewFiles = files.length;
    if (countNewFiles + PropertyPhotos.length > 4) {
      const rest = countNewFiles - PropertyPhotos.length;
      throw new BadRequestException(`Can only add ${rest} more photo`);
    }

    const photosAndProperty = files.map((photo) => {
      return { photoUrl: photo.path, propertyId: property.id };
    });

    await prisma.propertyPhotos.createMany({ data: photosAndProperty });

    return { count: files.length };
  }
}
